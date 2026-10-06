import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tv, Star, Play, Calendar, Award } from 'lucide-react'
import './SeriesSection.css'

const topSeries = [
  {
    title: "Breaking Bad",
    year: 2008,
    rating: 4.8,
    votes: 3487,
    genre: "Crime, Drama",
    image: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600&h=850&fit=crop"
  },
  {
    title: "Band of Brothers",
    year: 2001,
    rating: 4.8,
    votes: 2956,
    genre: "War, Drama",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=850&fit=crop"
  },
  {
    title: "Chernobyl",
    year: 2019,
    rating: 4.8,
    votes: 2734,
    genre: "History, Drama",
    image: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&h=850&fit=crop"
  },
  {
    title: "The Wire",
    year: 2002,
    rating: 4.7,
    votes: 2489,
    genre: "Crime, Drama",
    image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&h=850&fit=crop"
  },
  {
    title: "Game of Thrones",
    year: 2011,
    rating: 4.6,
    votes: 4267,
    genre: "Fantasy, Drama",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=850&fit=crop"
  },
  {
    title: "The Sopranos",
    year: 1999,
    rating: 4.7,
    votes: 2145,
    genre: "Crime, Drama",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&h=850&fit=crop"
  },
  {
    title: "True Detective",
    year: 2014,
    rating: 4.5,
    votes: 2378,
    genre: "Crime, Thriller",
    image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&h=850&fit=crop"
  },
  {
    title: "Planet Earth II",
    year: 2016,
    rating: 4.7,
    votes: 1856,
    genre: "Documentary, Nature",
    image: "https://images.unsplash.com/photo-1473445361085-b9a07f55608b?w=600&h=850&fit=crop"
  }
]

const seriesByGenre = {
  Crime: [
    { title: "Breaking Bad", year: 2008, rating: 4.8 },
    { title: "The Wire", year: 2002, rating: 4.7 },
    { title: "The Sopranos", year: 1999, rating: 4.7 },
    { title: "True Detective", year: 2014, rating: 4.5 },
    { title: "Mindhunter", year: 2017, rating: 4.4 }
  ],
  Drama: [
    { title: "Band of Brothers", year: 2001, rating: 4.8 },
    { title: "Chernobyl", year: 2019, rating: 4.8 },
    { title: "Mad Men", year: 2007, rating: 4.5 },
    { title: "The Crown", year: 2016, rating: 4.4 },
    { title: "Succession", year: 2018, rating: 4.6 }
  ],
  'Sci-Fi': [
    { title: "Black Mirror", year: 2011, rating: 4.4 },
    { title: "Dark", year: 2017, rating: 4.5 },
    { title: "Westworld", year: 2016, rating: 4.3 },
    { title: "Stranger Things", year: 2016, rating: 4.4 },
    { title: "The Expanse", year: 2015, rating: 4.5 }
  ],
  Comedy: [
    { title: "Fleabag", year: 2016, rating: 4.5 },
    { title: "The Office", year: 2005, rating: 4.4 },
    { title: "Ted Lasso", year: 2020, rating: 4.4 },
    { title: "The Bear", year: 2022, rating: 4.6 },
    { title: "Atlanta", year: 2016, rating: 4.3 }
  ],
  Fantasy: [
    { title: "Game of Thrones", year: 2011, rating: 4.6 },
    { title: "The Lord of the Rings: The Rings of Power", year: 2022, rating: 4.0 },
    { title: "House of the Dragon", year: 2022, rating: 4.4 },
    { title: "The Witcher", year: 2019, rating: 4.1 },
    { title: "Shadow and Bone", year: 2021, rating: 4.0 }
  ],
  Thriller: [
    { title: "True Detective", year: 2014, rating: 4.5 },
    { title: "Fargo", year: 2014, rating: 4.5 },
    { title: "The Night Of", year: 2016, rating: 4.4 },
    { title: "Ozark", year: 2017, rating: 4.4 },
    { title: "Narcos", year: 2015, rating: 4.4 }
  ]
}

const genreColors = {
  Crime: '#ff6b6b',
  Drama: '#4ecdc4',
  'Sci-Fi': '#06ffa5',
  Comedy: '#ffe66d',
  Fantasy: '#8b00ff',
  Thriller: '#f77f00'
}

const SeriesSection = () => {
  const [selectedGenre, setSelectedGenre] = useState('Crime')

  return (
    <>
      {/* Top Series of All Time */}
      <section id="top-series" className="section series-section">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="section-title">
            <Tv size={36} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
            Top Series of All Time
          </h2>

          <div className="series-grid">
            {topSeries.map((series, index) => (
              <motion.div
                key={index}
                className="series-card"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ scale: 1.05, y: -8 }}
              >
                <div className="series-rank">#{index + 1}</div>
                <div className="series-image" style={{ backgroundImage: `url(${series.image})` }}>
                  <div className="series-overlay">
                    <button className="series-play-button">
                      <Play size={20} fill="currentColor" />
                      Watch Trailer
                    </button>
                  </div>
                </div>
                <div className="series-info">
                  <h3 className="series-title">{series.title}</h3>
                  <div className="series-meta">
                    <div className="series-year">
                      <Calendar size={14} />
                      <span>{series.year}</span>
                    </div>
                    <div className="series-rating">
                      <Star size={16} fill="var(--accent-primary)" color="var(--accent-primary)" />
                      <span>{series.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="series-votes">{series.votes.toLocaleString()} votes</div>
                  <div className="series-genre">{series.genre}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Series by Genre */}
      <section id="series-genres" className="section series-genre-section">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="section-title">
            <Award size={36} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
            Top Series by Genre
          </h2>

          <div className="series-genre-container">
            <div className="series-genre-tabs">
              {Object.keys(seriesByGenre).map((genre) => (
                <motion.button
                  key={genre}
                  className={`series-genre-tab ${selectedGenre === genre ? 'active' : ''}`}
                  onClick={() => setSelectedGenre(genre)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    '--genre-color': genreColors[genre]
                  }}
                >
                  <span>{genre}</span>
                </motion.button>
              ))}
            </div>

            <div className="series-genre-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedGenre}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="series-genre-list"
                >
                  <div className="series-genre-header">
                    <h3 style={{ color: genreColors[selectedGenre] }}>
                      Top {selectedGenre} Series
                    </h3>
                  </div>

                  <div className="series-genre-items">
                    {seriesByGenre[selectedGenre].map((series, index) => (
                      <motion.div
                        key={series.title}
                        className="series-genre-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 8 }}
                        style={{
                          '--genre-color': genreColors[selectedGenre]
                        }}
                      >
                        <div className="series-genre-rank">#{index + 1}</div>
                        <div className="series-genre-info">
                          <h4>{series.title}</h4>
                          <p className="series-genre-year">{series.year}</p>
                        </div>
                        <div className="series-genre-rating">
                          <span className="rating-number">{series.rating.toFixed(1)}</span>
                          <span className="rating-label">★</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  )
}

export default SeriesSection
