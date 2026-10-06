"""What's Next? — Premium movie discovery platform.

A Flask application that layers a cinematic front-end over TMDB/OMDb and a
local SVD recommender built from MovieLens data.

Run:
    python app.py
"""
import hashlib
import io
import pickle
import re
import time
from datetime import datetime, timedelta
from functools import wraps

import difflib
import numpy as np
import pandas as pd
import requests
from flask import (
    Flask, Response, flash, jsonify, redirect, render_template, request, url_for
)
from flask_login import current_user, login_required, login_user, logout_user
from flask_limiter.errors import RateLimitExceeded
from requests.adapters import HTTPAdapter
from sqlalchemy import or_
from urllib3.util.retry import Retry
from werkzeug.security import check_password_hash, generate_password_hash

from config import Config
from extensions import cache, csrf, db, limiter, login_manager, migrate
from models import (
    CustomList, Follow, ListItem, MovieReview, Notification, PremiumMembership,
    ReviewVote, TitleLike, User, UserPreference, UserRating, ViewHistory,
    WatchlistItem,
)

app = Flask(__name__)

Config.validate()
app.config.from_object(Config)

db.init_app(app)
migrate.init_app(app, db)
csrf.init_app(app)
cache.init_app(app)
limiter.init_app(app)
login_manager.init_app(app)
login_manager.login_view = "login"
login_manager.login_message = "Please sign in to continue."
login_manager.login_message_category = "info"


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    if wants_json():
        return jsonify({"error": "Authentication required."}), 401
    flash("Please sign in to continue.", "info")
    return redirect(url_for("login", next=request.path))

with app.app_context():
    db.create_all()

# ==========================================================
# Configuration constants
# ==========================================================
TMDB_API_KEY = Config.TMDB_API_KEY
OMDB_API_KEY = Config.OMDB_API_KEY

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG = "https://image.tmdb.org/t/p"

LANGUAGE_ROWS = [
    ("en", "Hollywood"),
    ("hi", "Bollywood (Hindi)"),
    ("te", "Tollywood (Telugu)"),
    ("ta", "Kollywood (Tamil)"),
    ("ml", "Malayalam Cinema"),
    ("kn", "Kannada Cinema"),
    ("ko", "Korean Cinema"),
    ("ja", "Japanese Cinema"),
]
CURRENT_YEAR = datetime.now().year
YEARS = list(range(CURRENT_YEAR, 1948, -1))
LANG_LOOKUP = dict(LANGUAGE_ROWS)

# ==========================================================
# Resilient HTTP session (retries + timeouts)
# ==========================================================
tmdb_session = requests.Session()
_retry = Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=[500, 502, 503, 504],
    allowed_methods=["GET"],
)
tmdb_session.mount("https://", HTTPAdapter(max_retries=_retry))
tmdb_session.mount("http://", HTTPAdapter(max_retries=_retry))

APP_STARTED_AT = datetime.utcnow()

genre_maps = {"movie": {}, "tv": {}}       # {media_type: {id: name}}
genre_name_lookup = {}                      # {name: {"movie": id|None, "tv": id|None}}


def safe_json(url, params=None, timeout=6):
    """GET + JSON with retries; returns parsed JSON or None."""
    try:
        res = tmdb_session.get(url, params=params, timeout=timeout)
        if res.status_code != 200:
            return None
        return res.json()
    except (requests.exceptions.RequestException, ValueError):
        return None


def load_genre_maps():
    for media_type in ("movie", "tv"):
        data = safe_json(f"{TMDB_BASE}/genre/{media_type}/list", {"api_key": TMDB_API_KEY})
        if not data:
            continue
        for g in data.get("genres", []):
            genre_maps[media_type][g["id"]] = g["name"]
            genre_name_lookup.setdefault(g["name"], {"movie": None, "tv": None})
            genre_name_lookup[g["name"]][media_type] = g["id"]


load_genre_maps()


# ==========================================================
# OMDb — IMDb / Rotten Tomatoes / Metacritic ratings
# ==========================================================
@cache.memoize(timeout=3600)
def get_omdb_ratings(imdb_id):
    if not imdb_id:
        return {"imdb": None, "rt": None, "metacritic": None}

    result = {"imdb": None, "rt": None, "metacritic": None}

    data = safe_json(
        "https://www.omdbapi.com/",
        {"i": imdb_id, "apikey": OMDB_API_KEY},
    )
    if data and data.get("Response") == "True":
        if data.get("imdbRating") not in (None, "N/A"):
            result["imdb"] = data["imdbRating"]
        for entry in data.get("Ratings", []):
            if entry["Source"] == "Rotten Tomatoes":
                result["rt"] = entry["Value"]
            elif entry["Source"] == "Metacritic":
                result["metacritic"] = entry["Value"].split("/")[0]

    return result


# ==========================================================
# TMDB — full details for one title (movie OR tv), cached
# ==========================================================
@cache.memoize(timeout=300)
def get_tmdb_details(tmdb_id, media_type="movie"):
    endpoint = "tv" if media_type == "tv" else "movie"
    return safe_json(
        f"{TMDB_BASE}/{endpoint}/{tmdb_id}",
        {"api_key": TMDB_API_KEY, "append_to_response": "credits,external_ids,videos"},
    )


def get_tmdb_person(person_id):
    return safe_json(
        f"{TMDB_BASE}/person/{person_id}",
        {"api_key": TMDB_API_KEY, "append_to_response": "combined_credits,images"},
    )


# ==========================================================
# Card builder — works for a movie or a tv result
# ==========================================================
def build_card(result, media_type=None, score=None, with_ratings=False):
    media_type = media_type or result.get("media_type") or "movie"
    tmdb_id = result.get("id")
    if not tmdb_id:
        return None

    genre_names = result.get("genres")
    if isinstance(genre_names, list):
        genre_names = [g["name"] for g in genre_names]
    else:
        gmap = genre_maps.get(media_type, {})
        genre_ids = result.get("genre_ids") or []
        genre_names = [gmap.get(gid, "") for gid in genre_ids if gmap.get(gid)]
        genre_names = [g for g in genre_names if g]

    runtime = result.get("runtime")
    if runtime is None:
        episode_runtimes = result.get("episode_run_time")
        if episode_runtimes:
            runtime = episode_runtimes[0]

    poster_path = result.get("poster_path")
    backdrop_path = result.get("backdrop_path")

    card = {
        "TmdbID": tmdb_id,
        "MediaType": media_type,
        "TypeLabel": "Series" if media_type == "tv" else "Movie",
        "Movie": result.get("title") or result.get("name") or "Untitled",
        "Year": (result.get("release_date") or result.get("first_air_date") or "")[:4] or None,
        "Genre": " \u00b7 ".join(genre_names) if genre_names else "Unlisted",
        "GenreIds": (result.get("genre_ids") or []) or [],
        "Language": result.get("original_language"),
        "Poster": f"{TMDB_IMG}/w500{poster_path}" if poster_path else None,
        "PosterCard": f"{TMDB_IMG}/w342{poster_path}" if poster_path else None,
        "PosterSmall": f"{TMDB_IMG}/w185{poster_path}" if poster_path else None,
        "Blur": f"{TMDB_IMG}/w92{poster_path}" if poster_path else None,
        "Backdrop": f"{TMDB_IMG}/w1280{backdrop_path}" if backdrop_path else None,
        "Overview": (result.get("overview") or "").strip() or None,
        "TMDBRating": result.get("vote_average"),
        "Runtime": runtime,
        "Seasons": result.get("number_of_seasons"),
        "Cast": [c.get("name") for c in result.get("credits", {}).get("cast", [])[:5] if c.get("name")],
        "IMDbRating": None,
        "RTRating": None,
        "Metacritic": None,
        "ReleaseDate": result.get("release_date") or result.get("first_air_date"),
    }

    if score is not None:
        card["Match"] = round(float(score) * 100)

    if with_ratings:
        imdb_id = result.get("external_ids", {}).get("imdb_id") or result.get("imdb_id")
        ratings_data = get_omdb_ratings(imdb_id)
        card["IMDbRating"] = ratings_data["imdb"]
        card["RTRating"] = ratings_data["rt"]
        card["Metacritic"] = ratings_data["metacritic"]

    return card


def build_rich_card(tmdb_id, media_type="movie", score=None):
    details = get_tmdb_details(tmdb_id, media_type)
    if not details:
        return None
    details["media_type"] = media_type
    return build_card(details, media_type=media_type, score=score, with_ratings=True)


def card_from_details(tmdb_id, media_type="movie"):
    """Fast card from cached details (no OMDb lookup)."""
    details = get_tmdb_details(tmdb_id, media_type)
    if not details:
        return None
    details["media_type"] = media_type
    return build_card(details, media_type=media_type)


# ==========================================================
# TMDB catalog helpers
# ==========================================================
def tmdb_search_multi(query, limit=40):
    data = safe_json(
        f"{TMDB_BASE}/search/multi",
        {"api_key": TMDB_API_KEY, "query": query, "include_adult": False},
    )
    if not data:
        return []
    results = data.get("results", []) or []
    return [r for r in results if r.get("media_type") in ("movie", "tv")][:limit]


def tmdb_search(query, limit=8):
    normalized_query = " ".join(query.lower().split())

    def search_score(result):
        title = (result.get("title") or result.get("name") or "").lower()
        normalized_title = " ".join(title.split())
        similarity = difflib.SequenceMatcher(
            None, normalized_query, normalized_title
        ).ratio()
        prefix_bonus = 0.25 if normalized_title.startswith(normalized_query) else 0
        word_bonus = 0.12 if any(
            word.startswith(normalized_query)
            for word in normalized_title.split()
        ) else 0
        return similarity + prefix_bonus + word_bonus

    results = tmdb_search_multi(query, limit=40)
    results.sort(key=lambda result: (
        -search_score(result),
        -(result.get("popularity") or 0),
    ))
    return [build_card(r) for r in results[:limit] if build_card(r)]


def tmdb_trending(limit=18):
    data = safe_json(
        f"{TMDB_BASE}/trending/all/week",
        {"api_key": TMDB_API_KEY},
    )
    if not data:
        return []
    results = data.get("results", []) or []
    results = [r for r in results if r.get("media_type") in ("movie", "tv")]
    return [build_card(r) for r in results[:limit] if build_card(r)]


def tmdb_top_rated(media_type="movie", limit=18, min_votes=300, genre_id=None):
    endpoint = "tv" if media_type == "tv" else "movie"
    params = {
        "api_key": TMDB_API_KEY,
        "sort_by": "vote_average.desc",
        "vote_count.gte": min_votes,
        "vote_average.gte": 7,
        "page": 1,
    }
    if genre_id:
        params["with_genres"] = str(genre_id)
    data = safe_json(f"{TMDB_BASE}/discover/{endpoint}", params)
    if not data:
        return []
    return [
        build_card(r, media_type=media_type)
        for r in (data.get("results") or [])[:limit]
        if build_card(r, media_type=media_type)
    ]


def get_watch_providers(tmdb_id, media_type, region="US"):
    cached = cache.get(f"providers:{media_type}:{tmdb_id}:{region}")
    if cached is not None:
        return cached
    data = safe_json(
        f"{TMDB_BASE}/{media_type}/{tmdb_id}/watch/providers",
        {"api_key": TMDB_API_KEY, "watch_region": region},
    )
    providers = []
    if data:
        results = data.get("results") or {}
        entry = results.get(region) or (next(iter(results.values()), None) if results else None)
        if entry:
            for label, lst in (
                ("Stream", entry.get("flatrate") or []),
                ("Rent", entry.get("rent") or []),
                ("Buy", entry.get("buy") or []),
                ("Free", entry.get("free") or []),
            ):
                for p in lst[:4]:
                    providers.append({
                        "type": label,
                        "name": p.get("provider_name", "Unknown"),
                        "logo": f"{TMDB_IMG}/w92{p['logo_path']}" if p.get("logo_path") else None,
                    })
    cache.set(f"providers:{media_type}:{tmdb_id}:{region}", providers, timeout=86400)
    return providers


_SORT_MAP = {
    "movie": {
        "popularity": "popularity.desc",
        "rating": "vote_average.desc",
        "date": "primary_release_date.desc",
        "title": "original_title.asc",
    },
    "tv": {
        "popularity": "popularity.desc",
        "rating": "vote_average.desc",
        "date": "first_air_date.desc",
        "title": "original_name.asc",
    },
}


def tmdb_discover(
    media_type="movie",
    language=None, genre_id=None, year=None, limit=18,
    sort_by="popularity", page=1, vote_average_gte=None, run=False,
):
    endpoint = "tv" if media_type == "tv" else "movie"
    params = {
        "api_key": TMDB_API_KEY,
        "sort_by": _SORT_MAP[media_type].get(sort_by, "popularity.desc"),
        "vote_count.gte": 20,
        "page": page,
    }
    if language:
        params["with_original_language"] = language
    if genre_id:
        if isinstance(genre_id, (list, tuple, set)):
            params["with_genres"] = ",".join(str(g) for g in genre_id if g)
        else:
            params["with_genres"] = str(genre_id)
    if year:
        yr = str(year)
        params["primary_release_year" if media_type == "movie" else "first_air_date_year"] = yr
    if vote_average_gte:
        params["vote_average.gte"] = vote_average_gte
    if run:
        params["with_runtime.gte"] = run

    data = safe_json(f"{TMDB_BASE}/discover/{endpoint}", params)
    if not data:
        return []
    results = data.get("results", []) or []
    return [build_card(r, media_type=media_type) for r in results[:limit] if build_card(r)]


def tmdb_similar(tmdb_id, media_type="movie", limit=10):
    endpoint = "tv" if media_type == "tv" else "movie"
    for path in ("recommendations", "similar"):
        data = safe_json(
            f"{TMDB_BASE}/{endpoint}/{tmdb_id}/{path}",
            {"api_key": TMDB_API_KEY},
        )
        if data:
            results = data.get("results", []) or []
            if results:
                return [r["id"] for r in results[:limit]]
    return []


def tmdb_coming_soon(limit=24):
    cards = []
    data = safe_json(
        f"{TMDB_BASE}/movie/upcoming",
        {"api_key": TMDB_API_KEY, "region": "US"},
    )
    if data:
        for r in (data.get("results", []) or [])[:limit]:
            c = build_card(r, media_type="movie")
            if c:
                c["Year"] = (r.get("release_date") or "")[:4] or None
                cards.append(c)
    data = safe_json(
        f"{TMDB_BASE}/tv/on_the_air",
        {"api_key": TMDB_API_KEY},
    )
    if data:
        for r in (data.get("results", []) or [])[:limit]:
            c = build_card(r, media_type="tv")
            if c:
                c["Year"] = (r.get("first_air_date") or "")[:4] or None
                cards.append(c)
    return cards


# ==========================================================
# Local SVD similarity — bonus signal, movies only
# ==========================================================
try:
    with open("model/svd_model.pkl", "rb") as f:
        svd_model = pickle.load(f)
    trainset = svd_model.trainset
    item_factors = svd_model.qi
    item_norms = np.linalg.norm(item_factors, axis=1)

    movies = pd.read_csv(
        "movies.dat", sep="::", engine="python", encoding="latin-1",
        names=["MovieID", "Title", "Genres"],
    )
    ratings_df = pd.read_csv(
        "ratings.dat", sep="::", engine="python",
        names=["UserID", "MovieID", "Rating", "Timestamp"],
    )

    movies["CleanTitle"] = (
        movies["Title"].str.replace(r"\(\d{4}\)", "", regex=True).str.strip().str.lower()
    )
    SVD_READY = True
except (OSError, ValueError, KeyError, pickle.UnpicklingError):
    svd_model = None
    trainset = None
    item_factors = None
    item_norms = None
    movies = None
    ratings_df = None
    SVD_READY = False


def find_local_match(title):
    if not SVD_READY or not title:
        return None
    clean = title.split(" (")[0].strip().lower()
    close = difflib.get_close_matches(
        clean, movies["CleanTitle"].tolist(), n=1, cutoff=0.78
    )
    if not close:
        return None
    row = movies[movies["CleanTitle"] == close[0]].iloc[0]
    return int(row["MovieID"])


def local_svd_similar(movie_id, top_n=20):
    if not SVD_READY:
        return []
    try:
        inner_id = trainset.to_inner_iid(movie_id)
    except ValueError:
        return []
    target = item_factors[inner_id]
    sims = item_factors @ target
    sims = sims / (item_norms * item_norms[inner_id] + 1e-8)

    order = np.argsort(-sims)
    results = []
    for inner in order:
        if inner == inner_id:
            continue
        raw_id = trainset.to_raw_iid(inner)
        results.append((int(raw_id), float(sims[inner])))
        if len(results) >= top_n:
            break
    return results


def local_svd_predict(user_id, movie_id):
    """Predicted rating for a MovieLens user/item; used for correlation bonus."""
    if not SVD_READY:
        return None
    try:
        return float(svd_model.predict(str(user_id), str(movie_id)).est)
    except (ValueError, AttributeError):
        return None


# ==========================================================
# Shared recommendation logic
# ==========================================================
def get_recommendations_for(tmdb_id, source_title, media_type, top_n, exclude=None):
    exclude = set(exclude or [])

    def _unique(card_list):
        seen = set()
        out = []
        for c in card_list:
            key = (c["TmdbID"], c["MediaType"])
            if key in seen or key in exclude:
                continue
            seen.add(key)
            out.append(c)
        return out

    recommendations = []

    if media_type == "movie":
        local_id = find_local_match(source_title)
        if local_id:
            for raw_movie_id, score in local_svd_similar(local_id, top_n):
                row = movies[movies["MovieID"] == raw_movie_id]
                if row.empty:
                    continue
                title = row.iloc[0]["Title"]
                found = tmdb_search_multi(title.split(" (")[0], limit=1)
                if found:
                    try:
                        card = build_rich_card(found[0]["id"], media_type="movie", score=score)
                    except (TypeError, KeyError):
                        card = None
                    if card:
                        recommendations.append(card)

    recommendations = _unique(recommendations)

    if len(recommendations) < top_n:
        for similar_id in tmdb_similar(tmdb_id, media_type, top_n * 2):
            try:
                card = build_rich_card(similar_id, media_type=media_type)
            except (TypeError, KeyError):
                card = None
            if card:
                recommendations.append(card)
            if len(recommendations) >= top_n:
                break

    return _unique(recommendations)[:top_n]


# ==========================================================
# Homepage rows + hero rotation (cached)
# ==========================================================
def _row(r):
    return {
        "title": r[0],
        "movies": r[1] or [],
        "link": r[2],
        "ranked": bool(r[3]) if len(r) > 3 else False,
    }


def get_homepage_rows():
    cached = cache.get("homepage_rows_v3")
    if cached:
        return cached

    rows = [("Trending worldwide", tmdb_trending(), "/browse/trending")]

    trending_movies = tmdb_discover(media_type="movie", sort_by="popularity", limit=18)
    if trending_movies:
        rows.append(("Trending Movies Right Now", trending_movies, "/explore?sort_by=popularity&media_type=movie"))

    trending_series = tmdb_discover(media_type="tv", sort_by="popularity", limit=18)
    if trending_series:
        rows.append(("Trending Series Right Now", trending_series, "/explore?sort_by=popularity&media_type=tv"))

    top_movies = tmdb_top_rated("movie", limit=10, min_votes=800)
    if top_movies:
        rows.append(("Top Movies of All Time", top_movies, "/explore?sort_by=rating&media_type=movie", True))

    top_series = tmdb_top_rated("tv", limit=18, min_votes=150)
    if top_series:
        rows.append(("Top Series of All Time", top_series, "/explore?sort_by=rating&media_type=tv"))

    for label, gid in (
        ("Top Action Movies", 28),
        ("Top Drama Movies", 18),
        ("Top Comedy Movies", 35),
        ("Top Sci-Fi Movies", 878),
        ("Top Horror Movies", 27),
        ("Top Thriller Movies", 53),
        ("Top Animation Movies", 16),
        ("Top Romance Movies", 10749),
    ):
        hits = tmdb_top_rated("movie", limit=12, min_votes=150, genre_id=gid)
        if hits:
            rows.append((label, hits, f"/explore?sort_by=rating&media_type=movie&genres={gid}"))

    for code, label in LANGUAGE_ROWS:
        key = label.split(" ")[0].lower()
        row_movies = tmdb_discover(media_type="movie", language=code, limit=18)
        if row_movies:
            slug = {
                "en": "hollywood", "hi": "bollywood", "te": "tollywood",
                "ta": "kollywood", "ml": "malayalam", "kn": "kannada",
                "ko": "korean", "ja": "japanese",
            }.get(code, key)
            rows.append((label, row_movies, f"/browse/{slug}"))

    popular_series = tmdb_discover(media_type="tv", limit=18)
    if popular_series:
        rows.append(("Popular Web Series", popular_series, "/browse/series"))

    indian_series = []
    for code in ("hi", "te", "ta"):
        indian_series += tmdb_discover(media_type="tv", language=code, limit=10)
    seen = set()
    deduped = []
    for c in indian_series:
        k = (c["TmdbID"], c["MediaType"])
        if k not in seen:
            seen.add(k)
            deduped.append(c)
    deduped.sort(key=lambda c: c.get("TMDBRating") or 0, reverse=True)
    if deduped:
        rows.append(("Indian Web Series", deduped[:18], "/browse/indian-series"))

    rows = [r for r in rows if r[1]]
    if not rows:
        fallback = [
            ("Trending Movies", [
                ("Dune: Part Two", 2024, "movie", "Sci-Fi"),
                ("Oppenheimer", 2023, "movie", "Drama"),
                ("Barbie", 2023, "movie", "Comedy"),
                ("The Matrix", 1999, "movie", "Sci-Fi"),
                ("The Godfather", 1972, "movie", "Crime"),
            ], "/explore?media_type=movie"),
            ("Top Series of All Time", [
                ("Breaking Bad", 2008, "tv", "Crime"),
                ("Chernobyl", 2019, "tv", "Drama"),
                ("The Wire", 2002, "tv", "Crime"),
                ("Game of Thrones", 2011, "tv", "Fantasy"),
                ("Planet Earth II", 2016, "tv", "Documentary"),
            ], "/explore?media_type=tv"),
        ]
        rows = []
        for title, items, link in fallback:
            cards = []
            for name, year, media_type, genre in items:
                cards.append({
                    "Movie": name, "Year": year, "MediaType": media_type,
                    "TypeLabel": "Series" if media_type == "tv" else "Movie",
                    "Genre": genre, "GenreIds": [], "TmdbID": 0,
                    "TMDBRating": 0, "Poster": None, "PosterSmall": None,
                    "PosterCard": None, "Overview": "",
                })
            rows.append((title, cards, link))

    result = [_row(r) for r in rows]
    cache.set("homepage_rows_v3", result, timeout=600)
    return result


def get_hero_titles(limit=6):
    cached = cache.get("hero_titles_v1")
    if cached:
        return cached

    trending = tmdb_trending(limit=12)
    heroes = []
    for c in trending:
        if c.get("Backdrop"):
            heroes.append({
                "Title": c["Movie"],
                "Year": c["Year"],
                "Rating": c.get("TMDBRating"),
                "Overview": c.get("Overview"),
                "Backdrop": c["Backdrop"],
                "TmdbID": c["TmdbID"],
                "MediaType": c["MediaType"],
                "Genre": c.get("Genre"),
                "TypeLabel": c.get("TypeLabel"),
                "Seasons": c.get("Seasons"),
                "Runtime": c.get("Runtime"),
            })
        if len(heroes) >= limit:
            break

    cache.set("hero_titles_v1", heroes, timeout=600)
    return heroes


# ==========================================================
# Personalized recommendation rows (logged-in users)
# ==========================================================
def _user_context(user_id):
    ratings = UserRating.query.filter_by(user_id=user_id).order_by(
        UserRating.updated_at.desc()
    ).limit(200).all()
    watchlist = WatchlistItem.query.filter_by(user_id=user_id).limit(100).all()
    prefs = UserPreference.query.filter_by(user_id=user_id).first()

    return ratings, watchlist, prefs


def _favorite_genres(user_id, prefs, ratings):
    if prefs and prefs.favorite_genres:
        return [g for g in prefs.favorite_genres if isinstance(g, int)]

    counts = {}
    for r in ratings[:80]:
        card = card_from_details(r.tmdb_id, r.media_type)
        if not card:
            continue
        for gid in (card.get("GenreIds") or []):
            counts[gid] = counts.get(gid, 0) + 1
    return [gid for gid, _ in sorted(counts.items(), key=lambda i: -i[1])[:3]]


def _favorite_languages(user_id, prefs, ratings):
    if prefs and prefs.favorite_languages:
        valid = [lang for lang in prefs.favorite_languages if lang in LANG_LOOKUP]
        if valid:
            return valid[0]

    counts = {}
    for r in ratings[:80]:
        card = card_from_details(r.tmdb_id, r.media_type)
        if not card:
            continue
        lang = card.get("Language")
        if lang and lang in LANG_LOOKUP:
            counts[lang] = counts.get(lang, 0) + 1
    if counts:
        return max(counts, key=counts.get)
    return "en"


def _exclude_keys(user_id):
    keys = set()
    for r in (UserRating.query.filter_by(user_id=user_id).all()) or []:
        keys.add((r.tmdb_id, r.media_type))
    for w in (WatchlistItem.query.filter_by(user_id=user_id).all()) or []:
        keys.add((w.tmdb_id, w.media_type))
    return keys


def get_personal_rows(user_id):
    cached = cache.get(f"personal_rows:{user_id}")
    if cached:
        return cached

    rows = []
    ratings, watchlist, prefs = _user_context(user_id)

    try:
        favorites = _favorite_genres(user_id, prefs, ratings)
        fav_lang = _favorite_languages(user_id, prefs, ratings)
        exclude = _exclude_keys(user_id)

        # --- Continue Watching (recent views, deduped) ---
        recent_views = ViewHistory.query.filter_by(user_id=user_id).order_by(
            ViewHistory.viewed_at.desc()
        ).limit(60).all()
        seen_cw = set()
        continue_cards = []
        for v in recent_views:
            key = (v.tmdb_id, v.media_type)
            if key in seen_cw:
                continue
            seen_cw.add(key)
            try:
                card = card_from_details(v.tmdb_id, v.media_type)
            except (TypeError, KeyError):
                card = None
            if card and (card["TmdbID"], card["MediaType"]) not in exclude:
                continue_cards.append(card)
            if len(continue_cards) >= 12:
                break
        if continue_cards:
            rows.append({"title": "Continue Watching", "movies": continue_cards, "link": "/watchlist"})

        # --- Recommended For You (hybrid: SVD + genre + popularity) ---
        pool = []
        seeds = [(r.tmdb_id, r.rating) for r in ratings if r.media_type == "movie" and r.rating >= 3.5][:4]
        high_rated = UserRating.query.filter_by(user_id=user_id).order_by(
            UserRating.rating.desc()
        ).first()
        for tmdb_id, rating in seeds:
            card = card_from_details(tmdb_id, "movie")
            if not card:
                continue
            local_id = find_local_match(card["Movie"])
            if local_id:
                for raw_id, sim in local_svd_similar(local_id, top_n=8):
                    row = movies[movies["MovieID"] == raw_id]
                    if row.empty:
                        continue
                    m = tmdb_search_multi(row.iloc[0]["Title"].split(" (")[0], limit=1)
                    if m:
                        pool.append((m[0]["id"], "movie", sim * rating))

        pool.sort(key=lambda t: -t[2])
        rec_cards = []
        for tmdb_id, mtype, _score in pool[:18]:
            try:
                card = card_from_details(tmdb_id, mtype)
            except (TypeError, KeyError):
                card = None
            if card and (card["TmdbID"], card["MediaType"]) not in exclude:
                rec_cards.append(card)
        if rec_cards:
            rows.append({"title": "Recommended For You", "movies": rec_cards, "link": "/explore"})
        else:
            # poor-man's fallback: simply top rated movies the user may like
            rows.append({"title": "Popular Now", "movies": tmdb_trending(), "link": "/browse/trending"})

        # --- Because You Liked [Top Title] ---
        if high_rated:
            seed = card_from_details(high_rated.tmdb_id, high_rated.media_type)
            if seed:
                recs = get_recommendations_for(
                    seed["TmdbID"], seed["Movie"], high_rated.media_type, 12, exclude=exclude
                )
                if recs:
                    rows.append({
                        "title": f"Because You Liked {seed['Movie']}",
                        "movies": recs,
                        "link": f"/title/{high_rated.media_type}/{high_rated.tmdb_id}",
                    })

        # --- Trending in [Favorite Genre] ---
        if favorites:
            genre_rows = tmdb_discover(
                media_type="movie", genre_id=favorites, limit=14,
                sort_by="popularity", page=1,
            )
            if genre_rows:
                fav_name = next(
                    (genre_maps["movie"].get(g) for g in favorites if genre_maps["movie"].get(g)),
                    "Your Favorite Genre",
                )
                rows.append({
                    "title": f"Trending in {fav_name}",
                    "movies": genre_rows,
                    "link": f"/genre/{favorites[0]}",
                })

        # --- Hidden Gems (highly rated, under the radar) ---
        gems = tmdb_discover(
            media_type="movie", limit=24, sort_by="rating",
            vote_average_gte=7.5, run=90,
        )
        gems = [g for g in gems if g.get("TMDBRating") and 7 <= g["TMDBRating"] <= 9][:14]
        if gems:
            rows.append({"title": "Hidden Gems", "movies": gems, "link": "/browse/top-rated"})

        # --- New Releases in [Preferred Language] ---
        new_releases = tmdb_discover(
            media_type="movie", limit=14, sort_by="date", language=fav_lang,
        )
        if new_releases:
            label = LANG_LOOKUP.get(fav_lang, "Your Language")
            rows.append({
                "title": f"New Releases in {label}",
                "movies": new_releases,
                "link": f"/browse/{_language_slug(fav_lang)}",
            })
    except Exception:
        rows = []

    cache.set(f"personal_rows:{user_id}", rows, timeout=900)
    return rows


def _language_slug(code):
    return {
        "en": "hollywood", "hi": "bollywood", "te": "tollywood", "ta": "kollywood",
        "ml": "malayalam", "kn": "kannada", "ko": "korean", "ja": "japanese",
    }.get(code, "hollywood")


# ==========================================================
# Trailer resolution
# ==========================================================
_trailer_re = re.compile(r'"videoId":"([A-Za-z0-9_-]{11})"|/watch\?v=([A-Za-z0-9_-]{11})')


def resolve_trailer(query):
    cached = cache.get(f"trailer:{query}")
    if cached is not None:
        return cached

    video_id = None
    try:
        res = tmdb_session.get(
            "https://www.youtube.com/results",
            params={"search_query": query},
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0 Safari/537.36"
                )
            },
            timeout=6,
        )
        if res.status_code == 200:
            match = _trailer_re.search(res.text)
            if match:
                video_id = match.group(1) or match.group(2)
    except requests.exceptions.RequestException:
        pass

    cache.set(f"trailer:{query}", video_id, timeout=3600)
    return video_id


def _trailer_query(title, year, media_type):
    label = "TV series" if media_type == "tv" else "movie"
    q = f"{title} ({year}) official trailer" if year else f"{title} {label} official trailer"
    return q


# ==========================================================
# User data helpers
# ==========================================================
def premium_required_payload():
    return {
        "error": "Premium membership required",
        "upgrade_url": url_for("premium"),
    }


def get_user_state(tmdb_id, media_type):
    """Return dict of the current user's interaction state (empty when logged out)."""
    state = {
        "IsPremium": current_user.is_authenticated and current_user.is_premium,
        "IsLoggedIn": current_user.is_authenticated,
        "InWatchlist": False,
        "LikedByMe": False,
        "MyRating": None,
        "MyReview": None,
        "MySpoiler": False,
        "WatchlistWatched": False,
    }
    if not current_user.is_authenticated:
        return state

    wl = WatchlistItem.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    like = TitleLike.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    rating = UserRating.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    review = MovieReview.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()

    state["InWatchlist"] = wl is not None
    state["WatchlistWatched"] = bool(wl and wl.watched)
    state["LikedByMe"] = like is not None
    state["MyRating"] = rating.rating if rating else None
    state["MyReview"] = review.experience if review else None
    state["MySpoiler"] = bool(review and review.spoiler)
    return state


def reviews_for_title(tmdb_id, media_type, current_uid):
    rows = MovieReview.query.filter_by(tmdb_id=tmdb_id, media_type=media_type).order_by(
        MovieReview.updated_at.desc()
    ).all()
    payload = []
    for r in rows:
        helpful = r.votes.filter_by(value=1).count()
        not_helpful = r.votes.filter_by(value=-1).count()
        my_vote = 0
        if current_uid:
            vote = ReviewVote.query.filter_by(review_id=r.id, user_id=current_uid).first()
            my_vote = vote.value if vote else 0
        rating = UserRating.query.filter_by(
            user_id=r.user_id, tmdb_id=tmdb_id, media_type=media_type
        ).first()
        payload.append({
            "id": r.id,
            "username": r.user.username,
            "avatar_url": r.user.avatar_url,
            "rating": rating.rating if rating else None,
            "experience": r.experience,
            "spoiler": r.spoiler,
            "helpful": helpful,
            "not_helpful": not_helpful,
            "my_vote": my_vote,
            "is_own": current_uid == r.user_id,
            "created": r.created_at.isoformat() if r.created_at else None,
        })
    return payload


def notify(user_id, ntype, message, link):
    if not user_id:
        return
    db.session.add(Notification(user_id=user_id, type=ntype, message=message, link=link))


# ==========================================================
# Context processors + shared helpers
# ==========================================================
_NAV_MAP = {
    "home": "home",
    "index": "home",
    "explore": "explore",
    "browse_category": "browse",
    "coming_soon": "coming",
    "watchlist": "list",
    "my_watches": "list",
    "community": "community",
    "stats": "stats",
    "lists": "lists",
    "profile": "profile",
}


@app.context_processor
def inject_globals():
    endpoint = request.endpoint or ""
    return {
        "current_year": datetime.now().year,
        "app_name": "What's Next?",
        "user_is_premium": current_user.is_authenticated and current_user.is_premium,
        "active_nav": _NAV_MAP.get(endpoint, ""),
        "media_type_filter": request.args.get("media_type", "movie") if request.args.get("media_type") in ("movie", "tv") else "all",
    }


def _build_genre_options():
    options = []
    seen = set()
    for gid, name in genre_maps["movie"].items():
        if name not in seen:
            options.append({"id": gid, "name": name})
            seen.add(name)
    for gid, name in genre_maps["tv"].items():
        if name not in seen:
            options.append({"id": gid, "name": name})
            seen.add(name)
    options.sort(key=lambda g: g["name"].lower())
    return options


def base_context(**overrides):
    context = {
        "years": YEARS,
        "years_range": range(1900, CURRENT_YEAR + 2),
        "genres": sorted(genre_name_lookup.keys()),
        "genre_options": _build_genre_options(),
        "languages": LANGUAGE_ROWS,
        "lang_lookup": LANG_LOOKUP,
        "selected": {"q": "", "year": "", "genre": "", "language": "", "media_type": "", "sort_by": "popularity"},
        "rows": [],
        "personalized_rows": [],
        "hero_titles": [],
        "recommendations": None,
        "source_movie": None,
        "explore_results": None,
        "explore_label": None,
        "page_obj": None,
    }
    context.update(overrides)
    return context


def wants_json():
    return (
        request.path.startswith("/api/")
        or request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or "/title/" in request.path
    )


@app.template_filter("smartdate")
def smartdate(value, fmt="%b %d, %Y"):
    if not value:
        return ""
    return value.strftime(fmt)


class RouteError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


# ==========================================================
# Home
# ==========================================================
@app.route("/")
def home():
    rows = get_homepage_rows()
    heroes = get_hero_titles()
    personalized = get_personal_rows(current_user.id) if current_user.is_authenticated else []

    q = request.args.get("q", "").strip()
    explore_results = None
    explore_label = None
    if q:
        results = tmdb_search(q, limit=18)
        if results:
            explore_results = results
            explore_label = f'Results for "{q}"'

    return render_template(
        "index.html",
        **base_context(
            rows=rows,
            personalized_rows=personalized,
            hero_titles=heroes,
            explore_results=explore_results,
            explore_label=explore_label,
        )
    )


# ==========================================================
# Search API (autocomplete + infinite scroll)
# ==========================================================
@app.route("/api/search")
@limiter.limit("30 per minute")
def api_search():
    query = request.args.get("q", "").strip()
    media_type = (request.args.get("media_type") or request.args.get("type", "")).strip().lower()
    page = _clamp_int(request.args.get("page"), 1, 1, 500)

    if len(query) < 2:
        return jsonify({"results": [], "total": 0, "page": 1})

    raw = tmdb_search_multi(query, limit=40)
    if media_type in ("movie", "tv"):
        raw = [r for r in raw if r.get("media_type") == media_type]

    start = (page - 1) * 20
    cards = [build_card(r) for r in raw if build_card(r)]
    total = len(cards)
    selected = cards[start:start + 20]
    return jsonify({
        "results": selected,
        "total": total,
        "page": page,
        "has_more": start + 20 < total,
        "query": query,
        "media_type": media_type,
    })


@app.route("/search")
def search_page():
    query = request.args.get("q", "").strip()
    media_type = (request.args.get("media_type") or request.args.get("type", "")).strip().lower()
    page = _clamp_int(request.args.get("page"), 1, 1, 500)
    if len(query) < 2:
        return render_template(
            "search_results.html",
            **base_context(explore_label="Search", search_results=[], search_query=query),
        )

    total, cards, has_more = search_paginated(query, media_type, page)
    return render_template(
        "search_results.html",
        **base_context(
            search_results=cards,
            search_query=query,
            explore_label=f'{total} result{"s" if total != 1 else ""} for "{query}"',
            page_obj={
                "page": page, "has_more": has_more, "total": total,
                "q": query, "media_type": media_type,
            },
        )
    )


# ==========================================================
# Explore (browse with filters) — HTML page
# ==========================================================
def _clamp_int(value, default, lo, hi):
    try:
        num = int(value)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, num))


def search_paginated(query, media_type="", page=1, per_page=24):
    raw = tmdb_search_multi(query, limit=60)
    if media_type in ("movie", "tv"):
        raw = [r for r in raw if r.get("media_type") == media_type]
    cards = [build_card(r) for r in raw if build_card(r)]
    total = len(cards)
    start = (page - 1) * per_page
    return total, cards[start:start + per_page], start + per_page < total


def _filter_params():
    return {
        "q": request.args.get("q", "").strip(),
        "media_type": (request.args.get("media_type") or request.args.get("type", "")).strip().lower(),
        "genres": request.args.get("genres", "").strip(),
        "language": request.args.get("language", "").strip(),
        "year_from": _clamp_int(request.args.get("year_from"), 1900, 1900, CURRENT_YEAR),
        "year_to": _clamp_int(request.args.get("year_to"), CURRENT_YEAR, 1900, CURRENT_YEAR),
        "rating_min": _clamp_int(request.args.get("rating_min"), 0, 0, 10),
        "sort_by": request.args.get("sort_by", "popularity").strip(),
        "runtime_min": _clamp_int(request.args.get("runtime_min"), 0, 0, 500),
        "seasons_min": _clamp_int(request.args.get("seasons_min"), 0, 0, 50),
        "page": _clamp_int(request.args.get("page"), 1, 1, 500),
    }


def discover_with_params(params, limit=24):
    media_types = ["movie", "tv"] if params["media_type"] not in ("movie", "tv") else [params["media_type"]]
    genre_ids = [int(g) for g in params["genres"].split(",") if g.isdigit()]

    cards = []
    for mtype in media_types:
        endpoint = "tv" if mtype == "tv" else "movie"
        disc = {"api_key": TMDB_API_KEY, "vote_count.gte": 20, "page": params["page"]}
        disc["sort_by"] = _SORT_MAP[mtype].get(params["sort_by"] or "popularity", "popularity.desc")

        if params["language"] in LANG_LOOKUP:
            disc["with_original_language"] = params["language"]
        if genre_ids:
            disc["with_genres"] = ",".join(str(g) for g in genre_ids)
        if params["year_from"] > 1900 or params["year_to"] < CURRENT_YEAR:
            disc["primary_release_date.gte" if mtype == "movie" else "first_air_date.gte"] = f"{params['year_from']}-01-01"
            disc["primary_release_date.lte" if mtype == "movie" else "first_air_date.lte"] = f"{params['year_to']}-12-31"
        if params["rating_min"] >= 1:
            disc["vote_average.gte"] = params["rating_min"]
        if params["runtime_min"] >= 1:
            disc["with_runtime.gte"] = params["runtime_min"]
        if mtype == "tv" and params["seasons_min"] >= 1:
            disc["with_number_of_seasons"] = params["seasons_min"]

        data = safe_json(f"{TMDB_BASE}/discover/{endpoint}", disc)
        if not data:
            continue
        for r in (data.get("results", []) or [])[:limit]:
            c = build_card(r, media_type=mtype)
            if c:
                cards.append(c)
    return cards


def _total_results(params):
    return min(10000, _clamp_int(request.args.get("total_results"), 0, 0, 10000))


@app.route("/explore")
def explore():
    params = _filter_params()
    cards = []
    if params["q"]:
        raw = tmdb_search_multi(params["q"], limit=40)
        if params["media_type"] in ("movie", "tv"):
            raw = [r for r in raw if r.get("media_type") == params["media_type"]]
        card_objs = [build_card(r) for r in raw if build_card(r)]
        total = len(card_objs)
        start = (params["page"] - 1) * 24
        cards = card_objs[start:start + 24]
        has_more = start + 24 < total
    else:
        cards = discover_with_params(params)
        total = len(cards)
        has_more = False

    return render_template(
        "explore.html",
        **base_context(
            selected=params,
            explore_results=cards,
            explore_label=request.args.get("label", "Explore"),
            total_results=_total_results(params),
            page_obj={"page": params["page"], "has_more": has_more, "total": total, **params},
        )
    )


# ==========================================================
# Explore / browse APIs (dynamic updates, infinite scroll)
# ==========================================================
@app.route("/api/explore")
@limiter.limit("30 per minute")
def api_explore():
    params = _filter_params()

    if params["q"]:
        raw = tmdb_search_multi(params["q"], limit=40)
        if params["media_type"] in ("movie", "tv"):
            raw = [r for r in raw if r.get("media_type") == params["media_type"]]
        cards = [build_card(r) for r in raw if build_card(r)]
        total = len(cards)
        start = (params["page"] - 1) * 24
        cards = cards[start:start + 24]
        has_more = start + 24 < total
    else:
        cards = discover_with_params(params)
        total = len(cards)
        has_more = False

    return jsonify({
        "results": cards,
        "total": total,
        "page": params["page"],
        "has_more": has_more,
    })


# ==========================================================
# Recommendation Route — exact title picked from autocomplete
# ==========================================================
@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        tmdb_id = int(request.form.get("tmdb_id", 0) or 0)
    except (TypeError, ValueError):
        tmdb_id = 0

    if tmdb_id <= 0:
        flash("Please search and pick a title from the dropdown to get recommendations.", "info")
        return redirect(url_for("home"))

    media_type = (request.form.get("media_type") or request.form.get("type", "movie")).strip().lower()
    if media_type not in ("movie", "tv"):
        media_type = "movie"
    top_n = _clamp_int(request.form.get("top_n"), 10, 4, 24)

    source_movie = build_rich_card(tmdb_id, media_type=media_type)
    if not source_movie:
        flash("Title details could not be loaded. Please try another title.", "error")
        return redirect(url_for("home"))

    recommendations = get_recommendations_for(tmdb_id, source_movie["Movie"], media_type, top_n)

    return render_template(
        "index.html",
        **base_context(recommendations=recommendations, source_movie=source_movie)
    )


# ==========================================================
# Title Detail — used by the "more info" modal (movie OR tv)
# ==========================================================
@app.route("/title/<media_type>/<int:tmdb_id>")
@limiter.limit("30 per minute")
def title_detail(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "invalid media type"}), 400

    card = build_rich_card(tmdb_id, media_type=media_type)
    if not card:
        return jsonify({"error": "Title not found"}), 404

    details = get_tmdb_details(tmdb_id, media_type) or {}
    current_uid = current_user.id if current_user.is_authenticated else None

    cast = []
    for c in details.get("credits", {}).get("cast", [])[:14]:
        cast.append({
            "name": c.get("name", "Unknown"),
            "character": c.get("character", ""),
            "profile_path": f"{TMDB_IMG}/w185{c['profile_path']}" if c.get("profile_path") else None,
        })

    similar = []
    for similar_id in tmdb_similar(tmdb_id, media_type, 12):
        c = card_from_details(similar_id, media_type)
        if c:
            similar.append(c)

    card.update(get_user_state(tmdb_id, media_type))
    card.update({
        "CastFull": cast,
        "Similar": similar,
        "Reviews": reviews_for_title(tmdb_id, media_type, current_uid),
        "WatchProviders": get_watch_providers(tmdb_id, media_type),
    })
    return jsonify(card)


# ==========================================================
# Interactivity — watchlist / like / rating / review / view
# ==========================================================
def _premium_gate():
    if not (current_user.is_authenticated and current_user.is_premium):
        return jsonify(premium_required_payload()), 402
    return None


@app.route("/title/<media_type>/<int:tmdb_id>/watchlist", methods=["POST"])
@login_required
def toggle_watchlist(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "invalid media type"}), 400
    gate = _premium_gate()
    if gate:
        return gate

    item = WatchlistItem.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    if item:
        db.session.delete(item)
        in_watchlist = False
    else:
        db.session.add(WatchlistItem(
            user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
        ))
        in_watchlist = True
    db.session.commit()
    return jsonify({"in_watchlist": in_watchlist})


@app.route("/title/<media_type>/<int:tmdb_id>/like", methods=["POST"])
@login_required
def toggle_like(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "invalid media type"}), 400
    gate = _premium_gate()
    if gate:
        return gate

    like = TitleLike.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    if like:
        db.session.delete(like)
        liked = False
    else:
        db.session.add(TitleLike(
            user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
        ))
        liked = True
    db.session.commit()
    count = TitleLike.query.filter_by(tmdb_id=tmdb_id, media_type=media_type).count()
    return jsonify({"liked": liked, "count": count})


@app.route("/title/<media_type>/<int:tmdb_id>/rating", methods=["POST"])
@login_required
def save_rating(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "invalid media type"}), 400
    gate = _premium_gate()
    if gate:
        return gate

    payload = request.get_json(silent=True) or request.form
    try:
        rating_value = float(payload.get("rating", 0))
    except (TypeError, ValueError):
        rating_value = 0
    if rating_value < 0.5 or rating_value > 5 or (rating_value * 2) % 1:
        return jsonify({"error": "Rating must be between 0.5 and 5 stars."}), 400

    rating = UserRating.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    if rating:
        rating.rating = rating_value
    else:
        db.session.add(UserRating(
            user_id=current_user.id, tmdb_id=tmdb_id,
            media_type=media_type, rating=rating_value
        ))
    db.session.commit()
    return jsonify({"rating": rating_value})


@app.route("/title/<media_type>/<int:tmdb_id>/review", methods=["POST"])
@login_required
def save_review(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "invalid media type"}), 400
    gate = _premium_gate()
    if gate:
        return gate

    payload = request.get_json(silent=True) or request.form
    experience = (payload.get("experience") or "").strip()
    spoiler = bool(payload.get("spoiler"))

    if not experience:
        return jsonify({"error": "Your review can't be empty."}), 400
    if len(experience) > 2000:
        return jsonify({"error": "Reviews are limited to 2000 characters."}), 400

    review = MovieReview.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    if review:
        review.experience = experience
        review.spoiler = spoiler
    else:
        db.session.add(MovieReview(
            user_id=current_user.id, tmdb_id=tmdb_id,
            media_type=media_type, experience=experience, spoiler=spoiler,
        ))
    db.session.commit()
    return jsonify({"experience": experience, "spoiler": spoiler})


@app.route("/title/<media_type>/<int:tmdb_id>/review/delete", methods=["POST"])
@login_required
def delete_review(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "invalid media type"}), 400

    review = MovieReview.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    rating = UserRating.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    if review:
        db.session.delete(review)
    if rating:
        db.session.delete(rating)
    db.session.commit()
    return jsonify({"deleted": True})


@app.route("/title/<media_type>/<int:tmdb_id>/view", methods=["POST"])
@login_required
def record_view(media_type, tmdb_id):
    gate = _premium_gate()
    if gate:
        return gate

    payload = request.get_json(silent=True) or {}
    try:
        seconds = int(payload.get("time_spent_seconds", 0))
    except (TypeError, ValueError):
        seconds = 0

    db.session.add(ViewHistory(
        user_id=current_user.id, tmdb_id=tmdb_id,
        media_type=media_type, time_spent_seconds=max(0, seconds),
    ))
    db.session.commit()
    return jsonify({"ok": True})


# ==========================================================
# Review voting + notifications
# ==========================================================
@app.route("/api/reviews/<int:review_id>/vote", methods=["POST"])
@limiter.limit("30 per minute")
@login_required
def vote_review(review_id):
    payload = request.get_json(silent=True) or request.form
    try:
        value = int(payload.get("value", 0))
    except (TypeError, ValueError):
        value = 0
    if value not in (-1, 0, 1):
        return jsonify({"error": "Invalid vote value."}), 400

    review = db.session.get(MovieReview, review_id)
    if not review:
        return jsonify({"error": "Review not found."}), 404

    existing = ReviewVote.query.filter_by(
        user_id=current_user.id, review_id=review_id
    ).first()

    if value == 0:
        if existing:
            db.session.delete(existing)
    else:
        if existing:
            existing.value = value
        else:
            db.session.add(ReviewVote(
                user_id=current_user.id, review_id=review_id, value=value
            ))
    db.session.commit()

    helpful = review.votes.filter_by(value=1).count()
    not_helpful = review.votes.filter_by(value=-1).count()

    if value == 1 and review.user_id != current_user.id:
        author_of_vote = current_user.username
        notify(
            review.user_id, "review_helpful",
            f"{author_of_vote} found your review helpful.",
            f"/title/{review.media_type}/{review.tmdb_id}#reviews",
        )
        db.session.commit()

    return jsonify({"helpful": helpful, "not_helpful": not_helpful, "my_vote": value})


# ==========================================================
# Watchlist pages
# ==========================================================
def _watchlist_payload(user_id):
    cards = []
    seen = set()
    items = WatchlistItem.query.filter_by(user_id=user_id).order_by(
        WatchlistItem.added_at.desc()
    ).all()
    for item in items:
        card = card_from_details(item.tmdb_id, item.media_type)
        if card and (card["TmdbID"], card["MediaType"]) not in seen:
            seen.add((card["TmdbID"], card["MediaType"]))
            card["Watched"] = item.watched
            card["AddedAt"] = item.added_at
            cards.append(card)
    return cards


@app.route("/watchlist")
@login_required
def watchlist():
    cards = _watchlist_payload(current_user.id)
    stats = {
        "total": len(cards),
        "movies": sum(1 for c in cards if c["MediaType"] == "movie"),
        "series": sum(1 for c in cards if c["MediaType"] == "tv"),
        "watched": sum(1 for c in cards if c.get("Watched")),
    }
    genre_counts = {}
    for c in cards:
        for g in c.get("Genre", "").split(" \u00b7 "):
            if g and g != "Unlisted":
                genre_counts[g] = genre_counts.get(g, 0) + 1
    return render_template(
        "watchlist.html",
        **base_context(cards=cards, wl_stats=stats, wl_genre_counts=dict(sorted(genre_counts.items(), key=lambda i: -i[1]))),
    )


@app.route("/watchlist/export")
@login_required
def export_watchlist():
    items = WatchlistItem.query.filter_by(user_id=current_user.id).order_by(
        WatchlistItem.added_at.desc()
    ).all()

    buf = io.StringIO()
    buf.write("tmdb_id,media_type,title,year,rating,added_at,watched\n")
    for item in items:
        card = card_from_details(item.tmdb_id, item.media_type)
        if not card:
            continue
        title = card["Movie"].replace(",", " ")
        rating = card.get("TMDBRating") or ""
        line = f"{item.tmdb_id},{item.media_type},\"{title}\",{card['Year'] or ''},{rating},{item.added_at},{1 if item.watched else 0}\n"
        buf.write(line)
    buf.seek(0)
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=my-watchlist.csv"},
    )


@app.route("/title/<media_type>/<int:tmdb_id>/watched", methods=["POST"])
@login_required
def toggle_watched(media_type, tmdb_id):
    item = WatchlistItem.query.filter_by(
        user_id=current_user.id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    if not item:
        return jsonify({"error": "Not in your watchlist."}), 404
    item.watched = not item.watched
    db.session.commit()
    return jsonify({"watched": item.watched})


@app.route("/my-watches")
@login_required
def my_watches():
    experiences = []
    for review in MovieReview.query.filter_by(user_id=current_user.id).order_by(
        MovieReview.updated_at.desc()
    ).all():
        card = card_from_details(review.tmdb_id, review.media_type)
        if not card:
            continue
        rating = UserRating.query.filter_by(
            user_id=current_user.id,
            tmdb_id=review.tmdb_id,
            media_type=review.media_type,
        ).first()
        experiences.append({
            "title": card["Movie"],
            "year": card["Year"],
            "poster": card["PosterCard"],
            "tmdb_id": review.tmdb_id,
            "media_type": review.media_type,
            "experience": review.experience,
            "spoiler": review.spoiler,
            "rating": rating.rating if rating else None,
        })
    return render_template(
        "my_watches.html",
        **base_context(experiences=experiences),
    )


# ==========================================================
# Browse categories
# ==========================================================
CATEGORY_MAP = {
    "trending": {"type": "trending"},
    "popular": {"type": "discover", "media_type": "movie", "sort_by": "popularity"},
    "top-rated": {"type": "discover", "media_type": "movie", "sort_by": "rating", "vote_average_gte": 7.5},
    "series": {"type": "discover", "media_type": "tv", "sort_by": "popularity"},
    "korean": {"type": "discover", "media_type": "movie", "language": "ko"},
    "japanese": {"type": "discover", "media_type": "movie", "language": "ja"},
    "hollywood": {"type": "discover", "media_type": "movie", "language": "en"},
    "bollywood": {"type": "discover", "media_type": "movie", "language": "hi"},
    "tollywood": {"type": "discover", "media_type": "movie", "language": "te"},
    "kollywood": {"type": "discover", "media_type": "movie", "language": "ta"},
    "malayalam": {"type": "discover", "media_type": "movie", "language": "ml"},
    "kannada": {"type": "discover", "media_type": "movie", "language": "kn"},
    "indian-series": {"type": "discover", "media_type": "tv", "languages": ["hi", "te", "ta"]},
}

CATEGORY_TITLES = {
    "trending": "Trending This Week",
    "popular": "Popular Movies",
    "top-rated": "Top Rated",
    "series": "Popular Series",
    "korean": "Korean Cinema",
    "japanese": "Japanese Cinema",
    "hollywood": "Hollywood",
    "bollywood": "Bollywood",
    "tollywood": "Tollywood",
    "kollywood": "Kollywood",
    "malayalam": "Malayalam Cinema",
    "kannada": "Kannada Cinema",
    "indian-series": "Indian Web Series",
}


def _browse_cards(category, page=1, limit=24):
    spec = CATEGORY_MAP.get(category)
    if not spec:
        return []
    if spec["type"] == "trending":
        cards = tmdb_trending(limit=60)
        start = (page - 1) * limit
        return cards[start:start + limit], len(cards)

    cards = []
    for mtype in ([spec["media_type"]] if "media_type" in spec else ["movie", "tv"]):
        langs = spec.get("languages") or ([spec.get("language")] if "language" in spec else [None])
        for lang in langs:
            cards += tmdb_discover(
                media_type=mtype, language=lang or None,
                sort_by=spec.get("sort_by", "popularity"),
                limit=limit, vote_average_gte=spec.get("vote_average_gte"),
            )
    seen = set()
    deduped = []
    for c in cards:
        k = (c["TmdbID"], c["MediaType"])
        if k not in seen:
            seen.add(k)
            deduped.append(c)
    total = len(deduped)
    return deduped[:limit], total


@app.route("/browse/<category>")
def browse_category(category):
    if category not in CATEGORY_MAP:
        return render_template("errors/404.html"), 404
    page = _clamp_int(request.args.get("page"), 1, 1, 500)
    cards, total = _browse_cards(category, page=page)
    return render_template(
        "browse_category.html",
        **base_context(
            explore_results=cards,
            explore_label=CATEGORY_TITLES.get(category, category.replace("-", " ").title()),
            category=category,
            page_obj={"page": page, "has_more": total > page * 24, "total": total},
        )
    )


@app.route("/api/browse/<category>")
@limiter.limit("30 per minute")
def api_browse_category(category):
    if category not in CATEGORY_MAP:
        return jsonify({"results": [], "total": 0}), 404
    page = _clamp_int(request.args.get("page"), 1, 1, 500)
    cards, total = _browse_cards(category, page=page)
    return jsonify({
        "results": cards,
        "total": total,
        "page": page,
        "has_more": total > page * 24,
    })


@app.route("/genre/<int:genre_id>")
def genre_page(genre_id):
    name = genre_maps["movie"].get(genre_id) or genre_maps["tv"].get(genre_id) or "Genre"
    page = _clamp_int(request.args.get("page"), 1, 1, 500)
    cards = tmdb_discover(media_type="movie", genre_id=[genre_id], limit=48)
    tv_cards = tmdb_discover(media_type="tv", genre_id=[genre_id], limit=24)
    all_cards = cards + tv_cards
    return render_template(
        "browse_category.html",
        **base_context(
            explore_results=all_cards,
            explore_label=name,
            category=f"genre/{genre_id}",
        )
    )


@app.route("/coming-soon")
def coming_soon():
    cards = tmdb_coming_soon(limit=48)
    return render_template(
        "coming_soon.html",
        **base_context(explore_results=cards, explore_label="Coming Soon"),
    )


@app.route("/api/coming-soon")
@limiter.limit("30 per minute")
def api_coming_soon():
    page = _clamp_int(request.args.get("page"), 1, 1, 500)
    cards = tmdb_coming_soon(limit=page * 48)
    start = (page - 1) * 24
    return jsonify({
        "results": cards[start:start + 24],
        "total": len(cards),
        "page": page,
        "has_more": start + 24 < len(cards),
    })


@app.route("/person/<int:person_id>")
def person(person_id):
    data = get_tmdb_person(person_id)
    if not data:
        return render_template("errors/404.html"), 404

    combined = data.get("combined_credits", {}) or {}
    known_for = combined.get("cast", []) or []
    known_for.sort(key=lambda c: c.get("vote_count") or 0, reverse=True)
    known_for_cards = []
    for c in known_for[:14]:
        mtype = c.get("media_type")
        if mtype not in ("movie", "tv"):
            continue
        card = build_card(c, media_type=mtype)
        if card:
            card["Character"] = c.get("character") or ""
            known_for_cards.append(card)

    all_credits = []
    for entry in (combined.get("cast", []) or []) + (combined.get("crew", []) or []):
        mtype = entry.get("media_type")
        if mtype not in ("movie", "tv"):
            continue
        card = build_card(entry, media_type=mtype)
        if not card:
            continue
        card["Character"] = entry.get("character") or entry.get("job") or ""
        card["Department"] = entry.get("department") or ""
        all_credits.append(card)

    person_payload = {
        "id": person_id,
        "name": data.get("name"),
        "bio": data.get("biography"),
        "birthday": data.get("birthday"),
        "deathday": data.get("deathday"),
        "place_of_birth": data.get("place_of_birth"),
        "known_for_department": data.get("known_for_department"),
        "profile_path": f"{TMDB_IMG}/w342{data['profile_path']}" if data.get("profile_path") else None,
        "profile_large": f"{TMDB_IMG}/w500{data['profile_path']}" if data.get("profile_path") else None,
    }

    return render_template(
        "person.html",
        **base_context(
            person=person_payload,
            credits=all_credits,
            known_for=known_for_cards,
        )
    )


# ==========================================================
# Recommendations page-agnostic helpers for profile/stats/community
# ==========================================================
def _genres_by_tmdb(tmdb_id, media_type):
    card = card_from_details(tmdb_id, media_type)
    if not card:
        return []
    genres = [g for g in card.get("Genre", "").split(" \u00b7 ") if g and g != "Unlisted"]
    return genres


@app.route("/profile")
@login_required
def profile():
    ratings_count = UserRating.query.filter_by(user_id=current_user.id).count()
    watch_count = WatchlistItem.query.filter_by(user_id=current_user.id).count()
    review_count = MovieReview.query.filter_by(user_id=current_user.id).count()
    lists_count = CustomList.query.filter_by(user_id=current_user.id).count()
    prefs = UserPreference.query.filter_by(user_id=current_user.id).first()

    return render_template(
        "profile.html",
        **base_context(
            stats={
                "ratings": ratings_count,
                "watchlist": watch_count,
                "reviews": review_count,
                "lists": lists_count,
            },
            prefs={
                "favorite_genres": prefs.favorite_genres if prefs else [],
                "favorite_languages": prefs.favorite_languages if prefs else [],
            },
        )
    )


@app.route("/profile/update", methods=["POST"])
@login_required
def profile_update():
    payload = request.form
    display_name = (payload.get("display_name") or "").strip()[:60]
    bio = (payload.get("bio") or "").strip()[:500]
    theme = payload.get("theme", "auto")
    if theme not in ("auto", "dark", "light"):
        theme = "auto"

    allow_bleach = True
    try:
        import bleach
        bio = bleach.clean(bio, tags=[])
    except ImportError:
        allow_bleach = False

    user = db.session.get(User, current_user.id)
    user.display_name = display_name
    user.bio = bio
    user.theme = theme

    prefs = UserPreference.query.filter_by(user_id=current_user.id).first()
    if not prefs:
        prefs = UserPreference(user_id=current_user.id)
        db.session.add(prefs)

    try:
        genre_ids = [int(g) for g in payload.getlist("favorite_genres") if g.isdigit()]
        language_codes = [lang for lang in payload.getlist("favorite_languages") if lang in LANG_LOOKUP]
    except (TypeError, ValueError):
        genre_ids = []
        language_codes = []

    prefs.favorite_genres = list(dict.fromkeys(genre_ids))[:10]
    prefs.favorite_languages = language_codes[:3]

    db.session.commit()
    flash("Profile updated.", "success")
    return redirect(url_for("profile"))


@app.route("/api/theme", methods=["POST"])
@limiter.limit("30 per minute")
@login_required
def api_theme():
    payload = request.get_json(silent=True) or request.form
    theme = payload.get("theme", "auto")
    if theme not in ("auto", "dark", "light"):
        return jsonify({"error": "Invalid theme"}), 400
    user = db.session.get(User, current_user.id)
    user.theme = theme
    db.session.commit()
    return jsonify({"ok": True, "theme": theme})


@app.route("/api/password", methods=["POST"])
@login_required
def change_password():
    payload = request.get_json(silent=True) or request.form
    current_pw = payload.get("current_password", "")
    new_pw = payload.get("new_password", "")

    user = db.session.get(User, current_user.id)
    if not check_password_hash(user.password_hash, current_pw):
        if wants_json():
            return jsonify({"error": "Current password is incorrect."}), 400
        flash("Current password is incorrect.", "error")
        return redirect(url_for("profile"))

    problem = _password_problem(new_pw)
    if problem:
        if wants_json():
            return jsonify({"error": problem}), 400
        flash(problem, "error")
        return redirect(url_for("profile"))

    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    flash("Password updated.", "success")
    return redirect(url_for("profile"))


@app.route("/api/account/delete", methods=["POST"])
@login_required
def delete_account():
    payload = request.get_json(silent=True) or request.form
    confirm = payload.get("confirm", "")
    if confirm.strip().lower() != current_user.username.lower():
        if wants_json():
            return jsonify({"error": "Type your username to confirm deletion."}), 400
        flash("Type your username to confirm deletion.", "error")
        return redirect(url_for("profile"))

    uid = current_user.id
    db.session.query(ReviewVote).filter(ReviewVote.user_id == uid).delete(synchronize_session=False)
    db.session.query(ListItem).filter(ListItem.user_id == uid).delete(synchronize_session=False)
    db.session.query(CustomList).filter(CustomList.user_id == uid).delete(synchronize_session=False)
    db.session.query(Follow).filter(or_(Follow.follower_id == uid, Follow.followed_id == uid)).delete(synchronize_session=False)
    db.session.query(Notification).filter(or_(Notification.user_id == uid, Notification.actor_id == uid)).delete(synchronize_session=False)
    db.session.query(TitleLike).filter(TitleLike.user_id == uid).delete(synchronize_session=False)
    db.session.query(MovieReview).filter(MovieReview.user_id == uid).delete(synchronize_session=False)
    db.session.query(UserRating).filter(UserRating.user_id == uid).delete(synchronize_session=False)
    db.session.query(UserPreference).filter(UserPreference.user_id == uid).delete(synchronize_session=False)
    db.session.query(ViewHistory).filter(ViewHistory.user_id == uid).delete(synchronize_session=False)
    db.session.query(WatchlistItem).filter(WatchlistItem.user_id == uid).delete(synchronize_session=False)

    user = db.session.get(User, uid)
    db.session.delete(user)
    db.session.commit()

    logout_user()
    if wants_json():
        return jsonify({"ok": True})
    flash("Your account has been deleted. Goodbye for now.", "success")
    return redirect(url_for("home"))


def _password_problem(password):
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not any(ch.isupper() for ch in password):
        return "Password must contain at least one uppercase letter."
    if not any(ch.isdigit() for ch in password):
        return "Password must contain at least one number."
    return None


@app.route("/user/<username>")
def user_public(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return render_template("errors/404.html"), 404

    reviews = MovieReview.query.filter_by(user_id=user.id).order_by(
        MovieReview.updated_at.desc()
    ).limit(12).all()
    review_items = []
    for r in reviews:
        card = card_from_details(r.tmdb_id, r.media_type)
        rating = UserRating.query.filter_by(
            user_id=user.id, tmdb_id=r.tmdb_id, media_type=r.media_type
        ).first()
        review_items.append({
            "card": card,
            "experience": r.experience,
            "spoiler": r.spoiler,
            "rating": rating.rating if rating else None,
            "created": r.created_at,
        })

    lists = CustomList.query.filter_by(user_id=user.id, is_public=True).all()
    list_payloads = []
    for lst in lists:
        preview = []
        for item in lst.items.limit(4).all():
            card = card_from_details(item.tmdb_id, item.media_type)
            if card and card.get("PosterCard"):
                preview.append(card["PosterCard"])
        list_payloads.append({
            "id": lst.id,
            "name": lst.name,
            "description": lst.description,
            "count": lst.items.count(),
            "preview": preview,
        })
    watch_count = WatchlistItem.query.filter_by(user_id=user.id).count()
    rating_count = UserRating.query.filter_by(user_id=user.id).count()

    return render_template(
        "user_public.html",
        **base_context(
            profile_user=user.to_public_dict(),
            review_items=review_items,
            lists=list_payloads,
            stats={"watchlist": watch_count, "ratings": rating_count},
        )
    )


@app.route("/user/<username>/watchlist")
def user_public_watchlist(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return render_template("errors/404.html"), 404
    cards = []
    for item in WatchlistItem.query.filter_by(user_id=user.id).order_by(
        WatchlistItem.added_at.desc()
    ).limit(48).all():
        card = card_from_details(item.tmdb_id, item.media_type)
        if card:
            cards.append(card)
    return render_template(
        "browse_category.html",
        **base_context(
            explore_results=cards,
            explore_label=f"{user.username}'s Watchlist",
            category="user-watchlist",
        )
    )


# ==========================================================
# Statistics dashboard
# ==========================================================
def compute_stats(user_id):
    ratings = UserRating.query.filter_by(user_id=user_id).all()
    watch_items = WatchlistItem.query.filter_by(user_id=user_id).all()
    view_history = ViewHistory.query.filter_by(user_id=user_id).all()

    stats = {
        "movies": 0,
        "series": 0,
        "hours": 0,
        "watchlist": len(watch_items),
        "views": len(view_history),
        "avg_rating": 0,
        "ratings_distribution": {str(i): 0 for i in (0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0)},
        "genre_counts": {},
        "decade_counts": {},
        "language_counts": {},
        "monthly_activity": {},
        "monthly_ratings": {},
        "favorite_decade": "—",
        "favorite_language": "—",
    }

    if ratings:
        vals = [r.rating for r in ratings]
        stats["avg_rating"] = round(sum(vals) / len(vals), 2)

    seen_titles = {}
    for r in ratings:
        key = (r.tmdb_id, r.media_type)
        seen_titles.setdefault(key, r)
        bucket = f"{r.rating:.1f}"
        stats["ratings_distribution"][bucket] = stats["ratings_distribution"].get(bucket, 0) + 1
        created = r.created_at or datetime.utcnow()
        month_key = created.strftime("%Y-%m")
        stats["monthly_ratings"][month_key] = stats["monthly_ratings"].get(month_key, 0) + 1

    for key, r in seen_titles.items():
        card = card_from_details(r.tmdb_id, r.media_type)
        if not card:
            continue
        if r.media_type == "movie":
            stats["movies"] += 1
        else:
            stats["series"] += 1
        if card.get("Runtime"):
            if r.media_type == "movie":
                stats["hours"] += card["Runtime"]
            else:
                stats["hours"] += card["Runtime"] * 8  # approximated per season/episode
        for g in card.get("Genre", "").split(" \u00b7 "):
            if g and g != "Unlisted":
                stats["genre_counts"][g] = stats["genre_counts"].get(g, 0) + 1
        if card.get("Year"):
            decade = f"{int(card['Year'][:3])}0s"
            stats["decade_counts"][decade] = stats["decade_counts"].get(decade, 0) + 1
        lang = card.get("Language")
        if lang and lang in LANG_LOOKUP:
            stats["language_counts"][LANG_LOOKUP[lang]] = stats["language_counts"].get(LANG_LOOKUP[lang], 0) + 1

    for v in view_history:
        key = (v.viewed_at or datetime.utcnow()).strftime("%Y-%m")
        stats["monthly_activity"][key] = stats["monthly_activity"].get(key, 0) + v.time_spent_seconds

    sorted_months = sorted(stats["monthly_activity"].items(), key=lambda kv: kv[0], reverse=True)
    stats["monthly_activity_sorted"] = [
        {
            "month": month,
            "hours": round(seconds / 3600, 1 if seconds / 3600 < 10 else 0),
            "intensity": min(4, max(1, int((seconds / 3600) / 2 + 1))),
        }
        for month, seconds in sorted_months
    ]

    if stats["genre_counts"]:
        stats["favorite_decade"] = max(stats["decade_counts"], key=stats["decade_counts"].get, default="—") if stats["decade_counts"] else "—"
        stats["favorite_language"] = max(stats["language_counts"], key=stats["language_counts"].get, default="—") if stats["language_counts"] else "—"

    stats["hours"] = round(stats["hours"] / 60, 1)
    return stats


@app.route("/stats")
@login_required
def stats():
    user_stats = compute_stats(current_user.id)
    all_ratings = UserRating.query.all()
    community_avg = round(sum(r.rating for r in all_ratings) / len(all_ratings), 2) if all_ratings else None
    return render_template(
        "stats.html",
        **base_context(user_stats=user_stats, community_avg=community_avg),
    )


# ==========================================================
# Community
# ==========================================================
@app.route("/community")
def community():
    sort = request.args.get("sort", "newest")
    limit = _clamp_int(request.args.get("limit"), 30, 1, 120)

    if sort == "helpful":
        query = (db.session.query(MovieReview)
                 .order_by(MovieReview.updated_at.desc())
                 .limit(limit).all())
        query = sorted(query, key=lambda r: r.votes.filter_by(value=1).count(), reverse=True)
    elif sort == "rated":
        query = (MovieReview.query
                 .join(UserRating, (UserRating.user_id == MovieReview.user_id) &
                       (UserRating.tmdb_id == MovieReview.tmdb_id) &
                       (UserRating.media_type == MovieReview.media_type))
                 .order_by(UserRating.rating.desc())
                 .limit(limit).all())
    else:
        query = MovieReview.query.order_by(MovieReview.updated_at.desc()).limit(limit).all()

    items = []
    for r in query:
        card = card_from_details(r.tmdb_id, r.media_type)
        rating = UserRating.query.filter_by(
            user_id=r.user_id, tmdb_id=r.tmdb_id, media_type=r.media_type
        ).first()
        helpful = r.votes.filter_by(value=1).count()
        items.append({
            "card": card,
            "user": r.user.to_public_dict(),
            "experience": r.experience,
            "spoiler": r.spoiler,
            "rating": rating.rating if rating else None,
            "helpful": helpful,
            "created": r.created_at,
        })

    return render_template(
        "community.html",
        **base_context(review_items=items, sort_by=sort),
    )


# ==========================================================
# Custom lists
# ==========================================================
@app.route("/lists")
@login_required
def lists():
    my_lists = CustomList.query.filter_by(user_id=current_user.id).order_by(
        CustomList.updated_at.desc()
    ).all()
    public_lists = CustomList.query.filter_by(is_public=True).filter(
        CustomList.user_id != current_user.id
    ).order_by(CustomList.updated_at.desc()).limit(12).all()

    def list_payload(lst):
        preview = []
        for item in lst.items.limit(4).all():
            card = card_from_details(item.tmdb_id, item.media_type)
            if card:
                preview.append(card["PosterCard"])
        return {
            "id": lst.id,
            "name": lst.name,
            "description": lst.description,
            "is_public": lst.is_public,
            "is_official": lst.is_official,
            "username": lst.user.username,
            "count": lst.items.count(),
            "updated": lst.updated_at,
            "preview": preview,
        }

    return render_template(
        "lists.html",
        **base_context(
            my_lists=[list_payload(l) for l in my_lists],
            public_lists=[list_payload(l) for l in public_lists],
        )
    )


@app.route("/lists/create", methods=["POST"])
@login_required
def create_list():
    name = (request.form.get("name") or "").strip()[:80]
    description = (request.form.get("description") or "").strip()[:500]
    is_public = request.form.get("is_public") == "on"

    if not name:
        flash("Give your list a name.", "error")
        return redirect(url_for("lists"))

    db.session.add(CustomList(
        user_id=current_user.id, name=name, description=description, is_public=is_public
    ))
    db.session.commit()
    flash("List created.", "success")
    return redirect(url_for("lists"))


@app.route("/lists/<int:list_id>")
def view_list(list_id):
    lst = db.session.get(CustomList, list_id)
    if not lst:
        return render_template("errors/404.html"), 404
    if not lst.is_public and (not current_user.is_authenticated or lst.user_id != current_user.id):
        return render_template("errors/404.html"), 404

    items = []
    for item in lst.items:
        card = card_from_details(item.tmdb_id, item.media_type)
        if card:
            items.append(card)

    return render_template(
        "list_view.html",
        **base_context(
            list_data={
                "id": lst.id,
                "name": lst.name,
                "description": lst.description,
                "is_public": lst.is_public,
                "username": lst.user.username,
                "count": lst.items.count(),
            },
            explore_results=items,
        )
    )


@app.route("/api/lists/<int:list_id>/add", methods=["POST"])
@limiter.limit("30 per minute")
@login_required
def add_to_list(list_id):
    lst = db.session.get(CustomList, list_id)
    if not lst or lst.user_id != current_user.id:
        return jsonify({"error": "List not found."}), 404

    payload = request.get_json(silent=True) or request.form
    try:
        tmdb_id = int(payload.get("tmdb_id", ""))
        media_type = payload.get("media_type", "movie")
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid title."}), 400
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "Invalid media type."}), 400

    existing = ListItem.query.filter_by(
        list_id=list_id, tmdb_id=tmdb_id, media_type=media_type
    ).first()
    if existing:
        db.session.delete(existing)
        added = False
    else:
        position = max([i.position for i in lst.items.all()] or [-1]) + 1
        db.session.add(ListItem(
            list_id=list_id, tmdb_id=tmdb_id, media_type=media_type, position=position
        ))
        added = True
    db.session.commit()
    return jsonify({"added": added, "count": lst.items.count()})


@app.route("/api/lists/<int:list_id>/delete", methods=["POST"])
@limiter.limit("30 per minute")
@login_required
def delete_list(list_id):
    lst = db.session.get(CustomList, list_id)
    if not lst or lst.user_id != current_user.id:
        return jsonify({"error": "List not found."}), 404
    db.session.delete(lst)
    db.session.commit()
    return jsonify({"deleted": True})


# ==========================================================
# Notifications
# ==========================================================
@app.route("/api/notifications")
@limiter.limit("30 per minute")
@login_required
def api_notifications():
    rows = Notification.query.filter_by(user_id=current_user.id).order_by(
        Notification.created_at.desc()
    ).limit(30).all()
    unread = Notification.query.filter_by(
        user_id=current_user.id, read=False
    ).count()
    return jsonify({
        "notifications": [
            {
                "type": n.type,
                "message": n.message,
                "link": n.link,
                "read": n.read,
                "created": n.created_at.isoformat() if n.created_at else None,
            } for n in rows
        ],
        "unread": unread,
    })


@app.route("/api/notifications/read", methods=["POST"])
@login_required
def mark_notifications_read():
    Notification.query.filter_by(user_id=current_user.id, read=False).update({"read": True})
    db.session.commit()
    return jsonify({"ok": True})


# ==========================================================
# Trailer routes
# ==========================================================
@app.route("/trailer")
def trailer():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify({"video_id": None, "query": query})
    video_id = resolve_trailer(query)
    return jsonify({"video_id": video_id, "query": query})


@app.route("/trailer/<media_type>/<int:tmdb_id>")
def trailer_for_title(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "invalid media type"}), 400
    details = get_tmdb_details(tmdb_id, media_type)
    if not details:
        return jsonify({"video_id": None, "query": ""}), 404
    title = details.get("title") or details.get("name") or "Untitled"
    year = (details.get("release_date") or details.get("first_air_date") or "")[:4]

    # Check official TMDB videos
    video_id = None
    videos = details.get("videos", {}).get("results", []) or []
    trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer" and v.get("key")]
    if trailers:
        video_id = trailers[0]["key"]
    elif videos:
        yt_vids = [v for v in videos if v.get("site") == "YouTube" and v.get("key")]
        if yt_vids:
            video_id = yt_vids[0]["key"]

    if not video_id:
        query = _trailer_query(title, year, media_type)
        video_id = resolve_trailer(query)
    else:
        query = f"{title} ({year}) official trailer"

    return jsonify({"video_id": video_id, "query": query, "title": title})


# ==========================================================
# Auth — signup / login / logout
# ==========================================================
failed_logins = {}


@app.route("/signup", methods=["GET", "POST"])
@limiter.limit("5 per minute", methods=["POST"])
def signup():
    if current_user.is_authenticated:
        return redirect(url_for("home"))

    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")

        if not username or not email or not password:
            flash("All fields are required.", "error")
            return render_template("auth/signup.html")

        if len(username) < 3:
            flash("Username must be at least 3 characters.", "error")
            return render_template("auth/signup.html")

        problem = _password_problem(password)
        if problem:
            flash(problem, "error")
            return render_template("auth/signup.html")

        if password != confirm:
            flash("Passwords do not match.", "error")
            return render_template("auth/signup.html")

        if User.query.filter_by(username=username).first():
            flash("That username is already taken.", "error")
            return render_template("auth/signup.html")

        if User.query.filter_by(email=email).first():
            flash("An account with that email already exists.", "error")
            return render_template("auth/signup.html")

        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            theme="auto",
        )
        db.session.add(user)
        db.session.commit()

        login_user(user)
        flash(f"Welcome, {username}!", "success")
        return redirect(url_for("home"))

    return render_template("auth/signup.html")


@app.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per minute", methods=["POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("home"))

    if request.method == "POST":
        identifier = (request.form.get("identifier") or "").strip().lower()
        password = request.form.get("password", "")
        ip_key = request.remote_addr or "unknown"

        attempts = failed_logins.get(ip_key, 0)
        if attempts >= 10:
            flash("Too many failed attempts. Try again later.", "error")
            return render_template("auth/login.html", status_code=429), 429

        user = User.query.filter(
            (User.username == identifier) | (User.email == identifier)
        ).first()

        if user and check_password_hash(user.password_hash, password):
            failed_logins.pop(ip_key, None)
            login_user(user)
            flash(f"Welcome back, {user.username}!", "success")
            next_page = request.args.get("next")
            return redirect(next_page or url_for("home"))

        failed_logins[ip_key] = attempts + 1
        remaining = max(0, 10 - attempts - 1)
        if remaining <= 0:
            flash("Too many failed attempts. Try again later.", "error")
        else:
            flash(f"Invalid credentials. {remaining} attempt(s) left before lockout.", "error")

    return render_template("auth/login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You've been signed out.", "success")
    return redirect(url_for("home"))


@app.route("/premium")
def premium():
    return render_template("premium.html")


@app.route("/premium/activate", methods=["POST"])
@login_required
def activate_premium():
    if not current_user.premium_membership:
        db.session.add(PremiumMembership(user_id=current_user.id, active=True))
        db.session.commit()
    flash("Premium is active. Your watchlist, ratings and reviews are unlocked.", "success")
    return redirect(url_for("home"))


# ==========================================================
# Health + error handlers
# ==========================================================
@app.route("/api/health")
def api_health():
    db_status = "ok"
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception:
        db_status = "error"

    return jsonify({
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
        "uptime_seconds": int((datetime.utcnow() - APP_STARTED_AT).total_seconds()),
        "time": datetime.utcnow().isoformat(),
        "svd_ready": SVD_READY,
    })


@app.errorhandler(404)
def not_found(error):
    if wants_json():
        return jsonify({"error": "Not found."}), 404
    return render_template("errors/404.html"), 404


@app.errorhandler(429)
def rate_limited(error):
    if wants_json():
        return jsonify({"error": "Too many requests. Please slow down."}), 429
    return render_template("errors/500.html", error_message="Too many requests. Please slow down."), 429


@app.errorhandler(413)
def too_large(error):
    return jsonify({"error": "Upload is too large."}), 413


@app.errorhandler(400)
def bad_request(error):
    if wants_json():
        return jsonify({"error": getattr(error, "description", "Bad request.")}), 400
    return render_template("errors/500.html", error_message="Bad request."), 400


@app.errorhandler(500)
def server_error(error):
    db.session.rollback()
    if wants_json():
        return jsonify({"error": "Something went wrong on our side."}), 500
    return render_template("errors/500.html", error_message="Something went wrong on our side."), 500


@app.errorhandler(RateLimitExceeded)
def handle_ratelimit(error):
    return rate_limited(error)


# ==========================================================
# Run
# ==========================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)