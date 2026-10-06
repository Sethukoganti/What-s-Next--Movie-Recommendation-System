import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Tv, Trophy, ChevronRight, Star } from 'lucide-react'
import './CatalogSections.css'

const trending = [
  ['Dune: Part Two', 2024, 4.6, 'Sci-Fi', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=850&fit=crop'],
  ['The Last of Us', 2023, 4.7, 'Drama', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=850&fit=crop'],
  ['Oppenheimer', 2023, 4.5, 'History', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=850&fit=crop'],
  ['Fallout', 2024, 4.5, 'Adventure', 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=600&h=850&fit=crop'],
  ['The Bear', 2022, 4.6, 'Comedy', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=850&fit=crop']
]

const series = [
  ['Breaking Bad', 2008, 4.8, 'Crime', 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600&h=850&fit=crop'],
  ['Band of Brothers', 2001, 4.8, 'War', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=850&fit=crop'],
  ['Chernobyl', 2019, 4.8, 'History', 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&h=850&fit=crop'],
  ['True Detective', 2014, 4.5, 'Thriller', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&h=850&fit=crop'],
  ['Planet Earth II', 2016, 4.7, 'Nature', 'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?w=600&h=850&fit=crop']
]

const seriesGenres = {
  Crime: series,
  Drama: [series[1], series[2], ['The Sopranos', 1999, 4.7, 'Drama', series[0][4]], ['Mad Men', 2007, 4.5, 'Drama', series[2][4]]],
  'Sci-Fi': [series[2], ['Black Mirror', 2011, 4.4, 'Sci-Fi', trending[1][4]], trending[3], ['Dark', 2017, 4.5, 'Sci-Fi', trending[0][4]]],
  Comedy: [trending[4], ['Fleabag', 2016, 4.5, 'Comedy', series[3][4]], ['Ted Lasso', 2020, 4.4, 'Comedy', trending[1][4]], ['The Office', 2005, 4.4, 'Comedy', trending[4][4]]]
}

const CatalogCard = ({ item, index }) => (
  <motion.article className="catalog-card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: index * 0.06 }}>
    <div className="catalog-poster" style={{ backgroundImage: `url(${item[4]})` }}>
      <span className="catalog-rank">{String(index + 1).padStart(2, '0')}</span>
      <span className="catalog-type">{item[3]}</span>
    </div>
    <div className="catalog-info"><h3>{item[0]}</h3><div><span>{item[1]}</span><span className="catalog-rating"><Star size={14} fill="currentColor" /> {item[2]}</span></div></div>
  </motion.article>
)

const CatalogRow = ({ id, eyebrow, title, icon: Icon, items }) => (
  <section id={id} className="catalog-section section">
    <div className="catalog-heading"><div><p className="catalog-eyebrow"><Icon size={16} /> {eyebrow}</p><h2>{title}</h2></div><button className="catalog-link">View all <ChevronRight size={17} /></button></div>
    <div className="catalog-grid">{items.map((item, index) => <CatalogCard key={`${item[0]}-${index}`} item={item} index={index} />)}</div>
  </section>
)

const CatalogSections = () => {
  const [genre, setGenre] = useState('Crime')
  return <>
    <CatalogRow id="trending" eyebrow="Fresh this week" title="Trending movies & series" icon={Flame} items={trending} />
    <CatalogRow id="top-series" eyebrow="Critics' choice" title="Series of all time" icon={Tv} items={series} />
    <section id="series-genres" className="catalog-section section series-genre-section">
      <div className="catalog-heading"><div><p className="catalog-eyebrow"><Trophy size={16} /> Curated collections</p><h2>Series of all time by genre</h2></div></div>
      <div className="series-genre-tabs">{Object.keys(seriesGenres).map(name => <button key={name} className={genre === name ? 'active' : ''} onClick={() => setGenre(name)}>{name}</button>)}</div>
      <motion.div key={genre} className="catalog-grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{seriesGenres[genre].map((item, index) => <CatalogCard key={`${genre}-${item[0]}`} item={item} index={index} />)}</motion.div>
    </section>
  </>
}

export default CatalogSections