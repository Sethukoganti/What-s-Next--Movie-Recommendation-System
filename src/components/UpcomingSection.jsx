import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, Star } from 'lucide-react'
import './UpcomingSection.css'

const upcomingMovies = [
  { title: 'Dune: Messiah', year: 2026, rating: 4.7, image: 'https://images.unsplash.com/photo-1614726365723-49cfae927995?w=600&h=850&fit=crop', release: new Date(Date.now() + 3*86400000 + 5*3600000) },
  { title: 'The Dark Knight: Origins', year: 2026, rating: 4.8, image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=850&fit=crop', release: new Date(Date.now() + 7*86400000 + 12*3600000) },
  { title: 'Eclipse of Stars', year: 2025, rating: 4.5, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=850&fit=crop', release: new Date(Date.now() + 14*86400000 + 8*3600000) },
  { title: 'Midnight Protocol', year: 2026, rating: 4.3, image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=850&fit=crop', release: new Date(Date.now() + 21*86400000 + 3*3600000) },
  { title: 'Neon Horizon', year: 2025, rating: 4.6, image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=850&fit=crop', release: new Date(Date.now() + 2*86400000 + 18*3600000) },
  { title: 'Shadow Empire', year: 2026, rating: 4.4, image: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=600&h=850&fit=crop', release: new Date(Date.now() + 10*86400000 + 6*3600000) },
  { title: 'Crimson Sky', year: 2025, rating: 4.9, image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600&h=850&fit=crop', release: new Date(Date.now() + 5*86400000 + 22*3600000) },
  { title: 'The Last Signal', year: 2026, rating: 4.2, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=850&fit=crop', release: new Date(Date.now() + 28*86400000 + 10*3600000) },
]

const CountdownCard = ({ movie, index }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0 })
  useEffect(() => {
    const tick = () => {
      const diff = movie.release - new Date()
      if (diff <= 0) { setTimeLeft({ d: 0, h: 0, m: 0 }); return }
      setTimeLeft({ d: Math.floor(diff/86400000), h: Math.floor((diff%86400000)/3600000), m: Math.floor((diff%3600000)/60000) })
    }
    tick(); const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [movie.release])
  return (
    <motion.article className="upcoming-card glassmorphism" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.6 }} aria-label={`${movie.title} upcoming`}>
      <div className="upcoming-poster-wrapper"><img src={movie.image} alt={movie.title} loading="lazy" /></div>
      <div className="upcoming-info">
        <h3>{movie.title}</h3>
        <div className="upcoming-meta"><span><Calendar size={14} /> {movie.year}</span><span><Star size={14} /> {movie.rating}</span></div>
        <div className="countdown"><Clock size={14} /><span>{timeLeft.d}d</span><span>{timeLeft.h}h</span><span>{timeLeft.m}m</span></div>
        <div className="release-date">Release: {movie.release.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </motion.article>
  )
}

export default function UpcomingSection() {
  return (
    <section id="upcoming" className="section upcoming-section" aria-label="Upcoming releases">
      <h2 className="section-title"><span>Upcoming Releases</span></h2>
      <div className="upcoming-grid">{upcomingMovies.map((m, i) => <CountdownCard key={m.title} movie={m} index={i} />)}</div>
    </section>
  )
}
