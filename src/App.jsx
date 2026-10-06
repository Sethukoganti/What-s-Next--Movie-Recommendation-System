import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Info,
  Menu,
  Play,
  Search,
  Star,
  X,
} from 'lucide-react';
import './App.css';
import { useWatchlist } from './hooks/useWatchlist';
import {
  getPosterPath,
  tmdbDiscover,
  tmdbGenreList,
  tmdbMovieDetails,
  tmdbSearch,
  tmdbTopRated,
  tmdbTrending,
  tmdbUpcoming,
} from './services/tmdb';

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=500&q=80';

function App() {
  const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  return (
    <BrowserRouter>
      <AppShell
        watchlist={watchlist}
        addToWatchlist={addToWatchlist}
        removeFromWatchlist={removeFromWatchlist}
        isInWatchlist={isInWatchlist}
      />
    </BrowserRouter>
  );
}

function AppShell({ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }) {
  const [scrollY, setScrollY] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const data = await tmdbSearch(trimmed, 1, 'multi');
        if (active) {
          setSearchResults(data.results.filter((item) => item.media_type !== 'person').slice(0, 8));
        }
      } catch {
        if (active) setSearchResults([]);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="trailer-app">
      <header className={`topbar ${scrollY > 30 ? 'is-scrolled' : ''}`}>
        <div className="nav-shell">
          <button className="menu-button" aria-label="Open menu">
            <Menu size={18} />
          </button>

          <Link to="/" className="brand" aria-label="TrailerVault home">
            <span className="brand-mark">TV</span>
            <span className="brand-text">Trailer<span>Vault</span></span>
          </Link>

          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/genres">Genres</NavLink>
            <NavLink to="/watchlist">Watchlist</NavLink>
            <a href="#">Movies</a>
            <a href="#">TV Shows</a>
          </nav>

          <div className="nav-actions">
            <button className="icon-button" aria-label="Search" onClick={() => setSearchOpen(true)}>
              <Search size={18} />
            </button>
            <Link to="/watchlist" className="icon-button" aria-label="Watchlist">
              <Bookmark size={18} />
              {watchlist.length > 0 && <span className="watchlist-count">{watchlist.length}</span>}
            </Link>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="login-button">Log In</button>
          </div>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              watchlist={watchlist}
              isInWatchlist={isInWatchlist}
              addToWatchlist={addToWatchlist}
              removeFromWatchlist={removeFromWatchlist}
            />
          }
        />
        <Route
          path="/movie/:id"
          element={
            <MovieDetailPage
              watchlist={watchlist}
              isInWatchlist={isInWatchlist}
              addToWatchlist={addToWatchlist}
              removeFromWatchlist={removeFromWatchlist}
            />
          }
        />
        <Route path="/genres" element={<GenresPage />} />
        <Route path="/genres/:genreId/:genreName" element={<GenreDetailPage />} />
        <Route path="/watchlist" element={<WatchlistPage watchlist={watchlist} removeFromWatchlist={removeFromWatchlist} />} />
      </Routes>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              className="search-panel"
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <button className="close-search" aria-label="Close search" onClick={() => setSearchOpen(false)}>
                <X size={20} />
              </button>

              <div className="search-field">
                <Search size={20} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search movies, shows, genres..."
                  aria-label="Search content"
                />
              </div>

              <div className="search-results-grid">
                {query.trim() ? (
                  searchResults.length ? (
                    searchResults.map((movie) => (
                      <Link
                        to={movie.media_type === 'tv' ? `/movie/${movie.id}` : `/movie/${movie.id}`}
                        key={`${movie.media_type}-${movie.id}`}
                        className="search-result-card"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery('');
                        }}
                      >
                        <img src={getPosterPath(movie.poster_path) || FALLBACK_POSTER} alt={movie.title || movie.name} />
                        <div>
                          <h4>{movie.title || movie.name}</h4>
                          <span>{(movie.release_date || movie.first_air_date || '2024').slice(0, 4)} • {movie.genre_ids?.slice(0, 1).join(', ') || 'Movie'}</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="empty-state">No trailers found for your search.</div>
                  )
                ) : (
                  <>
                    <div className="search-label">Trending searches</div>
                    {['Action', 'Sci‑Fi', 'Drama', 'Comedy'].map((term) => (
                      <button key={term} className="trend-chip" onClick={() => setQuery(term)}>{term}</button>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HomePage({ watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist }) {
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [genres, setGenres] = useState([]);
  const [activeHero, setActiveHero] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [trendingData, topRatedData, upcomingData, genreData] = await Promise.all([
          tmdbTrending('movie', 1),
          tmdbTopRated('movie', 1),
          tmdbUpcoming(1),
          tmdbGenreList(),
        ]);

        if (!mounted) return;
        setFeaturedMovies(trendingData.results.slice(0, 5));
        setTopRated(topRatedData.results.slice(0, 12));
        setUpcoming(upcomingData.results.slice(0, 12));
        setGenres(genreData.genres.slice(0, 8));
      } catch (error) {
        console.error('Home page data failed to load', error);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!featuredMovies.length) return;
    const timer = window.setInterval(() => {
      setActiveHero((current) => (current + 1) % featuredMovies.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [featuredMovies]);

  const hero = featuredMovies[activeHero] || null;

  if (!hero) {
    return <div className="page-shell page-loading">Loading trailers…</div>;
  }

  return (
    <main className="movie-page">
      <section className="hero-section">
        <AnimatePresence mode="wait">
          <motion.div
            key={hero.id}
            className="hero-backdrop"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{ backgroundImage: `url(${getPosterPath(hero.backdrop_path, 'original') || getPosterPath(hero.poster_path, 'original') || FALLBACK_POSTER})` }}
          >
            <div className="hero-overlay" />
            <div className="hero-content">
              <div className="quality-pill">HD</div>
              <h1>{hero.title}</h1>
              <div className="hero-meta">
                <span>{(hero.release_date || '2024').slice(0, 4)}</span>
                <span>⭐ {Number(hero.vote_average || 0).toFixed(1)}</span>
                <span>{Math.round(hero.vote_count / 100) / 10 || 'New'}</span>
                <span>{hero.genre_ids?.slice(0, 2).map((id) => id).join(' • ') || 'Action'}</span>
              </div>
              <p>{hero.overview || 'A high-impact cinematic story built for the big screen.'}</p>
              <div className="hero-buttons">
                <Link className="primary-button" to={`/movie/${hero.id}`}>
                  <Play size={18} fill="currentColor" /> Watch Trailer
                </Link>
                <button className="secondary-button" onClick={() => {}}>
                  <Info size={18} /> More Info
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="hero-dots" aria-label="Featured title navigation">
          {featuredMovies.map((item, index) => (
            <button
              key={item.id}
              aria-label={`Show ${item.title}`}
              className={index === activeHero ? 'dot active' : 'dot'}
              onClick={() => setActiveHero(index)}
            />
          ))}
        </div>
      </section>

      <div className="content-shell">
        <ContentRow title="Trending Now" emoji="🔥" items={featuredMovies} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} isInWatchlist={isInWatchlist} />
        <ContentRow title="Top Rated" emoji="⭐" items={topRated} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} isInWatchlist={isInWatchlist} />
        <ContentRow title="Coming Soon" emoji="🎬" items={upcoming} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} isInWatchlist={isInWatchlist} />

        <section className="genres-section">
          <div className="row-header genre-header">
            <h2><span>🎯</span>Browse by Genre</h2>
            <Link className="see-all" to="/genres">See All →</Link>
          </div>
          <div className="genre-grid">
            {genres.map((genre) => (
              <Link key={genre.id} to={`/genres/${genre.id}/${encodeURIComponent(genre.name)}`} className="genre-card">
                <span>{genre.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MovieDetailPage({ watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist }) {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadMovie() {
      setLoading(true);
      try {
        const data = await tmdbMovieDetails(id, 'movie');
        if (mounted) setMovie(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMovie();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className="page-shell page-loading">Loading movie details…</div>;
  }

  if (!movie) {
    return <div className="page-shell page-loading">Movie not found.</div>;
  }

  const trailer = movie.videos?.results?.find((video) => video.type === 'Trailer' || video.type === 'Teaser') || movie.videos?.results?.[0];
  const inWatchlist = isInWatchlist(movie.id);

  return (
    <main className="page-shell">
      <div className="movie-detail-hero" style={{ backgroundImage: `url(${getPosterPath(movie.backdrop_path, 'original') || getPosterPath(movie.poster_path, 'original') || FALLBACK_POSTER})` }}>
        <div className="movie-detail-overlay" />
        <div className="movie-detail-content">
          <div className="quality-pill">HD</div>
          <h1>{movie.title}</h1>
          <div className="hero-meta">
            <span>{(movie.release_date || '2024').slice(0, 4)}</span>
            <span>⭐ {Number(movie.vote_average || 0).toFixed(1)}</span>
            <span>{movie.runtime ? `${movie.runtime} min` : '2h 05m'}</span>
            <span>{movie.genres?.slice(0, 2).map((genre) => genre.name).join(' • ') || 'Drama'}</span>
          </div>
          <p>{movie.overview || 'A cinematic story full of tension, spectacle, and emotional stakes.'}</p>
          <div className="hero-buttons">
            <button
              className="primary-button"
              onClick={() => window.open(`https://www.youtube.com/watch?v=${trailer?.key || 'ScMzIvxBSi4'}`, '_blank', 'noopener,noreferrer')}
            >
              <Play size={18} fill="currentColor" /> Watch Trailer
            </button>
            <button
              className="secondary-button"
              onClick={() => (inWatchlist ? removeFromWatchlist(movie.id) : addToWatchlist(movie))}
            >
              <Heart size={18} fill={inWatchlist ? 'currentColor' : 'none'} /> {inWatchlist ? 'Saved' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-poster-block">
          <img src={getPosterPath(movie.poster_path, 'w500') || FALLBACK_POSTER} alt={movie.title} className="detail-poster" />
        </div>

        <div className="detail-copy">
          <h2>Overview</h2>
          <p>{movie.overview || 'The story follows a gripping arc with emotional tension, big stakes, and memorable performances.'}</p>

          <div className="detail-stats-row">
            <span><Calendar size={16} /> {(movie.release_date || '2024').slice(0, 4)}</span>
            <span><Clock3 size={16} /> {movie.runtime ? `${movie.runtime} min` : '2h 05m'}</span>
            <span><Star size={16} fill="currentColor" /> {Number(movie.vote_average || 0).toFixed(1)}</span>
          </div>

          <div className="detail-cast-grid">
            <div><span>Cast</span><strong>{movie.credits?.cast?.[0]?.name || 'Alicia Moore'}</strong></div>
            <div><span>Director</span><strong>{movie.credits?.crew?.find((person) => person.job === 'Director')?.name || 'Chris Hart'}</strong></div>
            <div><span>Studio</span><strong>{movie.production_companies?.[0]?.name || 'Redframe Studios'}</strong></div>
          </div>
        </div>
      </div>

      {trailer && (
        <section className="trailer-box detail-trailer-box">
          <h3>Official Trailer</h3>
          <div className="video-shell">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?rel=0`}
              title={`${movie.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>
      )}
    </main>
  );
}

function GenresPage() {
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    let active = true;
    tmdbGenreList().then((data) => {
      if (active) setGenres(data.genres.slice(0, 12));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="section-header">
        <p className="eyebrow">Genres</p>
        <h1>Find your next obsession</h1>
      </section>
      <div className="genre-grid large-grid">
        {genres.map((genre) => (
          <Link key={genre.id} to={`/genres/${genre.id}/${encodeURIComponent(genre.name)}`} className="genre-card large-card">
            <span>{genre.name}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function GenreDetailPage() {
  const { genreId, genreName } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    tmdbDiscover({ genreId: Number(genreId), page: 1 })
      .then((data) => {
        if (active) setItems(data.results.slice(0, 12));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [genreId]);

  return (
    <main className="page-shell">
      <section className="section-header">
        <p className="eyebrow">Genre</p>
        <h1>{decodeURIComponent(genreName || 'Featured')}</h1>
      </section>
      {loading ? (
        <div className="page-loading">Loading titles…</div>
      ) : (
        <ContentRow title={decodeURIComponent(genreName || 'Featured')} emoji="🎞️" items={items} />
      )}
    </main>
  );
}

function WatchlistPage({ watchlist, removeFromWatchlist }) {
  return (
    <main className="page-shell">
      <section className="section-header">
        <p className="eyebrow">Saved</p>
        <h1>Your Watchlist</h1>
      </section>

      {watchlist.length === 0 ? (
        <div className="watchlist-empty">
          <p>No movies saved yet.</p>
          <Link className="primary-button page-link-button" to="/">Explore the catalog</Link>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchlist.map((movie) => (
            <div key={movie.id} className="watchlist-card">
              <Link to={`/movie/${movie.id}`}>
                <img src={getPosterPath(movie.poster_path, 'w500') || FALLBACK_POSTER} alt={movie.title || movie.name} />
              </Link>
              <div className="watchlist-card-info">
                <h3>{movie.title || movie.name}</h3>
                <div className="watchlist-meta">
                  <span>{(movie.release_date || movie.first_air_date || '2024').slice(0, 4)}</span>
                  <span>⭐ {Number(movie.vote_average || 0).toFixed(1)}</span>
                </div>
                <button className="secondary-button small-button" onClick={() => removeFromWatchlist(movie.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function ContentRow({ title, emoji, items, watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }) {
  const rowRef = useRef(null);

  const scrollRow = (direction) => {
    const container = rowRef.current;
    if (!container) return;
    container.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  return (
    <section className="content-row">
      <div className="row-header">
        <h2><span>{emoji}</span>{title}</h2>
        <button className="see-all">See All →</button>
      </div>

      <div className="row-controls">
        <button className="arrow-button" aria-label="Scroll left" onClick={() => scrollRow(-1)}>
          <ChevronLeft size={18} />
        </button>
        <button className="arrow-button" aria-label="Scroll right" onClick={() => scrollRow(1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div ref={rowRef} className="movie-row">
        {items.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            watchlist={watchlist}
            addToWatchlist={addToWatchlist}
            removeFromWatchlist={removeFromWatchlist}
            isInWatchlist={isInWatchlist}
          />
        ))}
      </div>
    </section>
  );
}

function MovieCard({ movie, watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }) {
  const posterPath = getPosterPath(movie.poster_path, 'w500') || getPosterPath(movie.backdrop_path, 'w500') || FALLBACK_POSTER;
  const year = (movie.release_date || movie.first_air_date || '2024').slice(0, 4);
  const inWatchlist = isInWatchlist ? isInWatchlist(movie.id) : false;

  return (
    <motion.div className="movie-card" whileHover={{ scale: 1.04, y: -8 }} transition={{ duration: 0.2 }}>
      <Link to={`/movie/${movie.id}`} className="poster-wrap">
        <img src={posterPath} alt={movie.title || movie.name} loading="lazy" />
        <div className="poster-glow" />
        <div className="poster-overlay" />
        <div className="badge top-left">HD</div>
        <div className="badge top-right">⭐ {Number(movie.vote_average || 0).toFixed(1)}</div>

        <div className="card-hover">
          <span className="play-circle"><Play size={18} fill="currentColor" /></span>
          <div className="genre-row">
            {(movie.genre_ids || [35, 18]).slice(0, 2).map((id) => (
              <span key={id}>{id}</span>
            ))}
          </div>
        </div>
      </Link>

      <div className="card-info">
        <div className="card-topline">
          <h3>{movie.title || movie.name}</h3>
          <button
            className="bookmark-mini"
            aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            onClick={() => (inWatchlist ? removeFromWatchlist(movie.id) : addToWatchlist(movie))}
          >
            <Bookmark size={15} fill={inWatchlist ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="card-meta">
          <span>{year}</span>
          <span>{movie.media_type || 'Movie'}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default App;
