import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Play, Plus, Clock, Calendar } from 'lucide-react'
import { useWatchlist } from '../hooks/useWatchlist'
import './MovieModal.css'

const MovieModal = ({ movie, onClose }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist()
  const inWatchlist = movie ? isInWatchlist(movie.id || movie.tmdbId) : false

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = '' }
  }, [onClose])

  const similar = [
    { id: 101, title: 'The Matrix', year: 1999, rating: 8.7, poster: 'https://image.tmdb.org/t/p/w200/f89U3N8d413F6tJ.jpg' },
    { id: 102, title: 'Blade Runner 2049', year: 2017, rating: 8.0, poster: 'https://image.tmdb.org/t/p/w200/giTu1mjfnNBW9.jpg' },
    { id: 103, title: 'Arrival', year: 2016, rating: 7.9, poster: 'https://image.tmdb.org/t/p/w200/3FfS.jpg' },
  ]

  const content = (
    <AnimatePresence>
      <motion.div
        className="movie-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        role="dialog"
        aria-modal="true"
        aria-label={movie ? `${movie.title || movie.name || 'Movie'} details` : 'Movie details'}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          className="movie-modal-card"
          initial={{ y: 60, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="modal-close" onClick={onClose} aria-label="Close movie details"><X size={28} /></button>

          <div className="modal-hero" style={{ backgroundImage: movie?.backdrop ? `url(${movie.backdrop})` : (movie?.poster ? `url(${movie.poster})` : 'none') }}>
            <div className="hero-gradient" />
            <div className="hero-content">
              <h1 className="modal-title">{movie?.title || movie?.name || 'Movie'}</h1>
              <div className="modal-meta-row">
                <span className="badge year">{movie?.year || (movie?.release_date?.slice(0,4)) || (movie?.first_air_date?.slice(0,4))}</span>
                <span className="badge genre">{movie?.genre || 'Drama'}</span>
                <span className="badge rating"><Star size={14} fill="var(--accent-primary)" /> {(movie?.rating || 8.2).toFixed(1)}</span>
              </div>
              <div className="modal-actions">
                <a href={`https://www.youtube.com/embed/dQw4w9WgXcQ`} target="_blank" rel="noopener noreferrer" className="btn-trailer" aria-label="Play trailer"><Play size={18} /> Watch Trailer</a>
                <button className="btn-together" aria-label="Watch together with friends" onClick={() => alert("Co-view session started!")}>Watch Together</button>
                <button className={`btn-watchlist ${inWatchlist ? 'added' : ''}`} onClick={() => inWatchlist ? removeFromWatchlist(movie.id || movie.tmdbId) : addToWatchlist(movie)} aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}><Plus size={18} /> {inWatchlist ? 'Saved' : 'Watchlist'}</button>
              </div>
            </div>
          </div>

          <div className="modal-body">
            <section className="modal-section" aria-label="Plot synopsis">
              <h2>Synopsis</h2>
              <p>{movie?.overview || movie?.plot || `Experience an extraordinary journey through the boundaries of imagination and time.`}</p>
            </section>

            <section className="modal-section" aria-label="Star rating">
              <h2>Rating</h2>
              <div className="star-row" aria-label={`Average rating ${(movie?.rating || 8.2).toFixed(1)} out of 10`}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={22} fill={(movie?.rating || 8.2) >= i * 2 ? 'var(--accent-primary)' : 'none'} stroke="currentColor" />
                ))}
                <span className="rating-text">{(movie?.rating || 8.2).toFixed(1)} / 10</span>
              </div>
            </section>

            <section className="modal-section" aria-label="Similar movies">
              <h2>Similar Movies</h2>
              <div className="similar-grid">
                {similar.map(s => (
                  <button key={s.id} className="similar-card" aria-label={`${s.title} details`}>
                    <img src={s.poster} alt={`${s.title} poster`} loading="lazy" />
                    <div className="similar-info"><h4>{s.title}</h4><span>{s.year} · {s.rating}</span></div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  return movie ? createPortal(content, document.body) : null
}

export default MovieModal
