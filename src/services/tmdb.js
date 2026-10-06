// TMDb API Service — connects to https://api.themoviedb.org/3
// Uses TMDB_API_KEY from .env: a17f2f4898af4f884748d4aa0baffe42

import axios from 'axios';

const TMDB_KEY = 'a17f2f4898af4f884748d4aa0baffe42';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

const client = axios.create({
  baseURL: BASE,
  params: { api_key: TMDB_KEY, language: 'en-US' },
  timeout: 8000,
});

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(url, params) {
  return url + JSON.stringify(params);
}

async function fetchWithCache(url, params = {}) {
  const key = getCacheKey(url, params);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && (now - cached.ts) < CACHE_TTL) return cached.data;
  const res = await client.get(url, { params });
  cache.set(key, { data: res.data, ts: now });
  return res.data;
}

export const getPosterPath = (path, size = 'w500') => (path ? `${IMG}/${size}${path}` : '');

// Trending
export const tmdbTrending = async (mediaType = 'movie', page = 1) =>
  fetchWithCache(`/trending/${mediaType}/week`, { page });

// Top Rated
export const tmdbTopRated = async (mediaType = 'movie', page = 1, genreId = null) => {
  const params = { page };
  if (genreId) params.with_genres = genreId;
  return fetchWithCache(`/movie/top_rated`, params);
};

// Upcoming
export const tmdbUpcoming = async (page = 1) =>
  fetchWithCache('/movie/upcoming', { page });

// Search
export const tmdbSearch = async (query, page = 1, mediaType = 'multi') =>
  fetchWithCache('/search/' + mediaType, { query, page, include_adult: false });

// Movie Details
export const tmdbMovieDetails = async (id, mediaType = 'movie') =>
  fetchWithCache(`/${mediaType}/${id}`, { append_to_response: 'credits,videos,reviews,similar,images' });

// Similar
export const tmdbSimilar = async (id, mediaType = 'movie', page = 1) =>
  fetchWithCache(`/${mediaType}/${id}/similar`, { page });

// Discover with filters (genre, year, rating)
export const tmdbDiscover = async (params = {}) => {
  const p = { page: params.page || 1, include_adult: false };
  if (params.genreId) p.with_genres = params.genreId;
  if (params.year) p.primary_release_year = params.year;
  if (params.minVote) p['vote_average.gte'] = params.minVote;
  return fetchWithCache('/discover/movie', p);
};

// Genre list
export const tmdbGenreList = async () =>
  fetchWithCache('/genre/movie/list');

// Now playing
export const tmdbNowPlaying = async (page = 1) =>
  fetchWithCache('/movie/now_playing', { page });
