import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Star, Play, Calendar } from 'lucide-react'
import './TrendingSection.css'

const trendingMovies = [
  {
    title: "Dune: Part Two",
    year: 2024,
    rating: 4.6,
    votes: 1847,
    genre: "Sci-Fi, Adventure",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&h=850&fit=crop",
    trending: 1
  },
  {
    title: "Oppenheimer",
    year: 2023,
    rating: 4.5,
    votes: 2293,
    genre: "History, Drama",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=850&fit=crop",
    trending: 2
  },
  {
    title: "Barbie",
    year: 2023,
    rating: 4.3,
    votes: 1956,
    genre: "Comedy, Adventure",
    image: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=600&h=850&fit=crop",
    trending: 3
  },
  {
    title: "Poor Things",
    year: 2023,
    rating: 4.4,
    votes: 1524,
    genre: "Comedy, Drama",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=850&fit=crop",
    trending: 4
  },
  {
    title: "Killers of the Flower Moon",
    year: 2023,
    rating: 4.3,
    votes: 1678,
    genre: "Crime, Drama",
    image: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=600&h=850&fit=crop",
    trending: 5
  },
  {
    title: "The Zone of Interest",
    year: 2023,
    rating: 4.2,
    votes: 1289,
    genre: "Drama, History",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=850&fit=crop",
    trending: 6
  }
]

const trendingSeries = [
  {
    title: "The Last of Us",
    year: 2023,
    rating: 4.7,
    votes: 2145,
    genre: "Drama, Thriller",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&h=850&fit=crop",
    trending: 1
  },
  {
    title: "Fallout",
    year: 2024,
    rating: 4.5,
    votes: 1823,
    genre: "Adventure, Sci-Fi",
    image: "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=600&h=850&fit=crop",
    trending: 2
  },
  {
    title: "The Bear",
    year: 2022,
    rating: 4.6,
    votes: 1967,
    genre: "Comedy, Drama",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&h=850&fit=crop",
    trending: 3
  },
  {
    title: "Shogun",
    year: 2024,
    rating: 4.8,
    votes: 1734,
    genre: "Drama, History",
    image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=850&fit=crop",
    trending: 4
  },
  {
    title: "True Detective: Night Country",
    year: 2024,
    rating: 4.2,
    votes: 1456,
    genre: "Crime, Mystery",
    image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&h=850&fit=crop",
    trending: 5
  },
  {
    title: "3 Body Problem",
    year: 2024,
    rating: 4.1,
    votes: 1598,
    genre: "Sci-Fi, Mystery",
    image: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=600&h=850&fit=crop",
    trending: 6
  }
]

const TrendingCard = ({ item, index, isSeries }) => (
  <motion.div
    className="trending-card"
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    viewport={{ once: true, margin: "-50px" }}
    whileHover={{ scale: 1.05, y: -8 }}
  >
    <div className="trending-badge">{item.trending}</div>
    <div className="trending-image" style={{ backgroundImage: `url(${item.image})` }}>
      <div className="trending-overlay">
        <button className="trending-play-button">
          <Play size={24} fill="currentColor" />
          <span>Watch Now</span>
        </button>
      </div>
    </div>
    <div className="trending-info">
      <h3 className="trending-title">{item.title}</h3>
      <div className="trending-meta">
        <div className="trending-year">
          <Calendar size={14} />
          <span>{item.year}</span>
        </div>
        <div className="trending-rating">
          <Star size={14} fill="var(--accent-primary)" color="var(--accent-primary)" />
          <span>{item.rating.toFixed(1)}</span>
        </div>
      </div>
      <div className="trending-genre">{item.genre}</div>
    </div>
  </motion.div>
)

const TrendingSection = () => {
  return (
    <section id="trending" className="section trending-section">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <h2 className="section-title">
          <TrendingUp size={36} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
          Trending This Week
        </h2>

        <div className="trending-subsection">
          <h3 className="trending-subtitle">🔥 Trending Movies</h3>
          <div className="trending-grid">
            {trendingMovies.map((movie, index) => (
              <TrendingCard key={index} item={movie} index={index} isSeries={false} />
            ))}
          </div>
        </div>

        <div className="trending-subsection">
          <h3 className="trending-subtitle">📺 Trending Series</h3>
          <div className="trending-grid">
            {trendingSeries.map((series, index) => (
              <TrendingCard key={index} item={series} index={index} isSeries={true} />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default TrendingSection
