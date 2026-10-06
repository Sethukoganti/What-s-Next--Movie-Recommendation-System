import React from 'react'
import { motion } from 'framer-motion'
import { Star, TrendingUp, Play } from 'lucide-react'
import './TopMoviesSection.css'

const topMovies = [
  {
    title: "The Shawshank Redemption",
    year: 1994,
    rating: 4.55,
    votes: 2227,
    genre: "Drama",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop"
  },
  {
    title: "The Godfather",
    year: 1972,
    rating: 4.52,
    votes: 2223,
    genre: "Crime, Drama",
    image: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&h=600&fit=crop"
  },
  {
    title: "Schindler's List",
    year: 1993,
    rating: 4.51,
    votes: 2304,
    genre: "Drama, History",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop"
  },
  {
    title: "Star Wars: A New Hope",
    year: 1977,
    rating: 4.45,
    votes: 2991,
    genre: "Action, Adventure",
    image: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=600&fit=crop"
  },
  {
    title: "The Matrix",
    year: 1999,
    rating: 4.41,
    votes: 2590,
    genre: "Action, Sci-Fi",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop"
  },
  {
    title: "Raiders of the Lost Ark",
    year: 1981,
    rating: 4.48,
    votes: 2514,
    genre: "Action, Adventure",
    image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&h=600&fit=crop"
  },
  {
    title: "The Usual Suspects",
    year: 1995,
    rating: 4.52,
    votes: 1783,
    genre: "Crime, Thriller",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&h=600&fit=crop"
  },
  {
    title: "Casablanca",
    year: 1942,
    rating: 4.41,
    votes: 1669,
    genre: "Drama, Romance",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop"
  }
]

const TopMoviesSection = () => {
  return (
    <section id="top-movies" className="section top-movies-section">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <h2 className="section-title">
          <TrendingUp size={36} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
          Top Movies of All Time
        </h2>

        <div className="movies-grid">
          {topMovies.map((movie, index) => (
            <motion.div
              key={index}
              className="movie-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true, margin: "-50px" }}
            >
              <div className="movie-rank">#{index + 1}</div>
              <div className="movie-image" style={{ backgroundImage: `url(${movie.image})` }}>
                <div className="movie-overlay">
                  <button className="play-button">
                    <Play size={20} fill="currentColor" />
                    Watch Trailer
                  </button>
                </div>
              </div>
              <div className="movie-info">
                <h3 className="movie-title">{movie.title}</h3>
                <p className="movie-year">{movie.year}</p>
                <div className="movie-meta">
                  <div className="movie-rating">
                    <Star size={16} fill="var(--accent-primary)" color="var(--accent-primary)" />
                    <span>{movie.rating.toFixed(2)}</span>
                  </div>
                  <div className="movie-votes">{movie.votes.toLocaleString()} votes</div>
                </div>
                <div className="movie-genre">{movie.genre}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export default TopMoviesSection
