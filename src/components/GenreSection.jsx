import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Film, Heart, Laugh, Zap, Ghost, Drama, Rocket, Sparkles } from 'lucide-react'
import './GenreSection.css'

const genres = [
  {
    name: 'Action',
    icon: Zap,
    color: '#ff6b6b',
    movies: [
      { title: 'The Matrix', year: 1999, rating: 4.41 },
      { title: 'Die Hard', year: 1988, rating: 4.25 },
      { title: 'Mad Max: Fury Road', year: 2015, rating: 4.38 },
      { title: 'Terminator 2: Judgment Day', year: 1991, rating: 4.32 }
    ]
  },
  {
    name: 'Drama',
    icon: Drama,
    color: '#4ecdc4',
    movies: [
      { title: 'The Shawshank Redemption', year: 1994, rating: 4.55 },
      { title: 'The Godfather', year: 1972, rating: 4.52 },
      { title: "Schindler's List", year: 1993, rating: 4.51 },
      { title: 'Forrest Gump', year: 1994, rating: 4.33 }
    ]
  },
  {
    name: 'Comedy',
    icon: Laugh,
    color: '#ffe66d',
    movies: [
      { title: 'Groundhog Day', year: 1993, rating: 4.12 },
      { title: 'The Big Lebowski', year: 1998, rating: 4.18 },
      { title: 'Monty Python and the Holy Grail', year: 1975, rating: 4.29 },
      { title: 'Back to the Future', year: 1985, rating: 4.35 }
    ]
  },
  {
    name: 'Romance',
    icon: Heart,
    color: '#ff006e',
    movies: [
      { title: 'Casablanca', year: 1942, rating: 4.41 },
      { title: 'Roman Holiday', year: 1953, rating: 4.28 },
      { title: 'Before Sunrise', year: 1995, rating: 4.15 },
      { title: 'Pride and Prejudice', year: 2005, rating: 4.18 }
    ]
  },
  {
    name: 'Sci-Fi',
    icon: Rocket,
    color: '#06ffa5',
    movies: [
      { title: 'Star Wars: A New Hope', year: 1977, rating: 4.45 },
      { title: 'Blade Runner', year: 1982, rating: 4.18 },
      { title: 'Inception', year: 2010, rating: 4.38 },
      { title: '2001: A Space Odyssey', year: 1968, rating: 4.05 }
    ]
  },
  {
    name: 'Horror',
    icon: Ghost,
    color: '#8b00ff',
    movies: [
      { title: 'The Shining', year: 1980, rating: 4.12 },
      { title: 'Psycho', year: 1960, rating: 4.35 },
      { title: 'Alien', year: 1979, rating: 4.28 },
      { title: 'The Silence of the Lambs', year: 1991, rating: 4.35 }
    ]
  },
  {
    name: 'Thriller',
    icon: Film,
    color: '#f77f00',
    movies: [
      { title: 'The Usual Suspects', year: 1995, rating: 4.52 },
      { title: 'Seven', year: 1995, rating: 4.28 },
      { title: 'Memento', year: 2000, rating: 4.22 },
      { title: 'The Sixth Sense', year: 1999, rating: 4.41 }
    ]
  },
  {
    name: 'Animation',
    icon: Sparkles,
    color: '#00d9ff',
    movies: [
      { title: 'Toy Story', year: 1995, rating: 4.15 },
      { title: 'Spirited Away', year: 2001, rating: 4.35 },
      { title: 'The Lion King', year: 1994, rating: 4.28 },
      { title: 'WALL-E', year: 2008, rating: 4.32 }
    ]
  }
]

const GenreSection = () => {
  const [selectedGenre, setSelectedGenre] = useState(genres[0])

  return (
    <section id="genres" className="section genre-section">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <h2 className="section-title">Explore by Genre</h2>

        <div className="genre-container">
          <div className="genre-tabs">
            {genres.map((genre, index) => {
              const Icon = genre.icon
              return (
                <motion.button
                  key={genre.name}
                  className={`genre-tab ${selectedGenre.name === genre.name ? 'active' : ''}`}
                  onClick={() => setSelectedGenre(genre)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  style={{
                    '--genre-color': genre.color
                  }}
                >
                  <Icon size={22} />
                  <span>{genre.name}</span>
                </motion.button>
              )
            })}
          </div>

          <div className="genre-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedGenre.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="genre-movies"
              >
                <div className="genre-header">
                  <h3 style={{ color: selectedGenre.color }}>
                    Top {selectedGenre.name} Movies
                  </h3>
                </div>

                <div className="genre-movie-list">
                  {selectedGenre.movies.map((movie, index) => (
                    <motion.div
                      key={movie.title}
                      className="genre-movie-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      style={{
                        '--genre-color': selectedGenre.color
                      }}
                    >
                      <div className="genre-movie-rank">#{index + 1}</div>
                      <div className="genre-movie-info">
                        <h4>{movie.title}</h4>
                        <p className="genre-movie-year">{movie.year}</p>
                      </div>
                      <div className="genre-movie-rating">
                        <span className="rating-number">{movie.rating.toFixed(2)}</span>
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
  )
}

export default GenreSection
