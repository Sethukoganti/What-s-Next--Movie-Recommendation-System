import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cineverse-watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist)); } catch {}
  }, [watchlist]);

  const addToWatchlist = useCallback((movie) => {
    setWatchlist(prev => {
      if (prev.find(w => w.id === movie.id)) return prev;
      return [...prev, { id: movie.id, title: movie.title || movie.name, poster_path: movie.poster_path, vote_average: movie.vote_average, media_type: movie.media_type || 'movie', addedAt: Date.now() }];
    });
  }, []);

  const removeFromWatchlist = useCallback((tmdbId) => {
    setWatchlist(prev => prev.filter(w => w.id !== tmdbId));
  }, []);

  const isInWatchlist = useCallback((tmdbId) => watchlist.some(w => w.id === tmdbId), [watchlist]);

  const clearWatchlist = useCallback(() => setWatchlist([]), []);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, clearWatchlist };
}
