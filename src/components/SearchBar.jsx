import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Film, Tv } from 'lucide-react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { tmdbSearch } from '../services/tmdb';
import { getPosterPath } from '../services/tmdb';
import './SearchBar.css';

const SearchBar = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      const data = await tmdbSearch(q, 1, 'multi');
      const movies = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 8);
      setResults(movies);
      setActiveIndex(-1);
    } catch (e) { setResults([]); }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(query.trim()), 300);
  }, [query, doSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[activeIndex]) onSelect(results[activeIndex]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  const select = (item) => { onSelect(item); setQuery(''); setResults([]); };

  return (
    <motion.div className="search-bar-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="search-bar-container" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrap">
          <Search size={22} className="search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, series, actors..."
            aria-label="Movie search"
          />
          {query && <button onClick={() => setQuery('')} aria-label="Clear" className="search-clear"><X size={18} /></button>}
        </div>
        <button className="search-close-btn" onClick={onClose} aria-label="Close search"><X size={22} /></button>

        <div className="search-filters">
          <button className={showFilters ? 'filter-active' : ''} onClick={() => setShowFilters(s => !s)}>Filters</button>
          <AnimatePresence>
            {showFilters && (
              <motion.div className="filter-dropdown" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                <label><input type="checkbox" defaultChecked /> Movies</label>
                <label><input type="checkbox" defaultChecked /> Series</label>
                <label><input type="checkbox" /> Upcoming</label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {results.length > 0 && (
            <motion.ul className="search-results" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}>
              {results.map((item, i) => (
                <li key={item.id + item.media_type} className={i === activeIndex ? 'active' : ''} onClick={() => select(item)}>
                  <img src={getPosterPath(item.poster_path, 'w92')} alt="" loading="lazy" />
                  <div>
                    <h4>{item.title || item.name}</h4>
                    <span>{item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4)} · {item.media_type === 'movie' ? 'Movie' : 'Series'}</span>
                  </div>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SearchBar;
