import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Award, Flame, Film } from 'lucide-react'
import './StaffPicksSection.css'

const collections = [
  { title: "Critics' Favorites", icon: Award, movies: [
    { title: 'Dune: Part Two', year: 2024, rating: 4.6, image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=450&fit=crop' },
    { title: 'Oppenheimer', year: 2023, rating: 4.5, image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450&fit=crop' },
    { title: 'Poor Things', year: 2023, rating: 4.4, image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop' },
    { title: 'The Zone of Interest', year: 2023, rating: 4.2, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop' },
  ]},
  { title: 'Hidden Gems', icon: Sparkles, movies: [
    { title: 'Past Lives', year: 2023, rating: 4.3, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=450&fit=crop' },
    { title: 'After Yang', year: 2021, rating: 4.1, image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=300&h=450&fit=crop' },
    { title: 'Aftersun', year: 2022, rating: 4.4, image: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=300&h=450&fit=crop' },
  ]},
  { title: 'Blockbusters', icon: Flame, movies: [
    { title: 'Top Gun: Maverick', year: 2022, rating: 4.7, image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450&fit=crop' },
    { title: 'Avatar: The Way of Water', year: 2022, rating: 4.5, image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=450&fit=crop' },
    { title: 'Barbie', year: 2023, rating: 4.3, image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop' },
  ]},
  { title: 'Indie Treasures', icon: Film, movies: [
    { title: 'Everything Everywhere', year: 2022, rating: 4.6, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=450&fit=crop' },
    { title: 'The Whale', year: 2022, rating: 4.0, image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=300&h=450&fit=crop' },
  ]},
]

export default function StaffPicksSection() {
  return (
    <section id="staff-picks" className="section staff-picks-section" aria-label="Curated staff picks">
      <h2 className="section-title"><span>Staff Picks</span></h2>
      <div className="collections-grid">{collections.map((col, idx) => (
        <motion.div key={col.title} className="collection-block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.12 }}>
          <div className="collection-header"><col.icon size={22} /><h3>{col.title}</h3></div>
          <div className="scroll-row">{col.movies.map(m => (
            <a key={m.title} href="#" className="pick-card" aria-label={m.title} onClick={e => { e.preventDefault(); alert('Movie details: ' + m.title) }}>
              <img src={m.image} alt={m.title} loading="lazy" />
              <div className="pick-info"><h4>{m.title}</h4><span>{m.year} • {m.rating}</span></div>
            </a>
          ))}</div>
        </motion.div>
      ))}</div>
    </section>
  )
}
