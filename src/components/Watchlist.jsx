import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Star, Trash2, Film } from 'lucide-react'
import './Watchlist.css'
import { useWatchlist } from '../hooks/useWatchlist'

const Watchlist = ({ onSelect }) => {
  const { watchlist, removeFromWatchlist } = useWatchlist()

  return (
    <section id="watchlist" className="section watchlist-section" aria-label="Your watchlist">
      <h2 className="section-title">Your Watchlist</h2>
      {watchlist.length === 0 ? (
        <div className="watchlist-empty" role="status" aria-label="Watchlist empty">
          <Film size={48} color="var(--accent-primary)" />
          <h3>Your watchlist is empty</h3>
          <p>Start adding movies you want to watch later.</p>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchlist.map((item, i) => (
            <motion.article
              key={item.id}
              className="watchlist-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              aria-label={`${item.title || 'Movie'} watchlist card`}
            >
              <button className="watchlist-image-btn" onClick={() => onSelect && onSelect(item)} aria-label={`Open ${item.title || 'movie'} details`}>
                <img src={item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster'} alt={`${item.title || 'Movie'} poster`} loading="lazy" />
              </button>
              <div className="watchlist-info">
                <h3><button onClick={() => onSelect && onSelect(item)} aria-label={`Open ${item.title || 'movie'} details`}>{item.title || item.name || 'Unknown'}</button></h3>
                <div className="watchlist-meta">
                  <span><Star size={14} fill="var(--accent-primary)" /> {(item.vote_average || item.rating || 0).toFixed(1)}</span>
                  <span><Clock size={14} /> Added recently</span>
                </div>
                <button onClick={() => removeFromWatchlist(item.id)} className="watchlist-remove" aria-label={`Remove ${item.title || 'movie'} from watchlist`}><Trash2 size={16} /> Remove</button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  )
}

export default Watchlist
