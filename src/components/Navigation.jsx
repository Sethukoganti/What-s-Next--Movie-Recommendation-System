import React from 'react'
import { Home, Star, Grid, Search, Sun, Moon, Bookmark } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useWatchlist } from '../hooks/useWatchlist'
import CineverseMark from './CineverseMark'
import './Navigation.css'

const Navigation = ({ scrollY, onSearch }) => {
  const { theme, toggleTheme } = useTheme()
  const { watchlist } = useWatchlist()
  const isScrolled = scrollY > 50

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <div className="nav-logo" onClick={() => scrollToSection('home')}>
          <CineverseMark size={36} />
          <span className="logo-text">CineVerse</span>
        </div>

        <ul className="nav-links">
          <li><a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}><Home size={20} /> Home</a></li>
          <li><a href="#top-movies" onClick={(e) => { e.preventDefault(); scrollToSection('top-movies'); }}><Star size={20} /> Top Movies</a></li>
          <li><a href="#genres" onClick={(e) => { e.preventDefault(); scrollToSection('genres'); }}><Grid size={20} /> Genres</a></li>
          <li><a href="#search" onClick={(e) => { e.preventDefault(); scrollToSection('search'); }}><Search size={20} /> Search</a></li>
        </ul>

        <div className="nav-actions">
          <button
            className="search-trigger"
            onClick={onSearch}
            aria-label="Open search"
            title="Search (try Konami code!)"
          >
            <Search size={20} />
          </button>
          <a href="#watchlist" className="watchlist-link" aria-label="Watchlist" title="Watchlist">
            <Bookmark size={20} />
            {watchlist.length > 0 && <span className="watchlist-badge" aria-label={`${watchlist.length} items in watchlist`}>{watchlist.length}</span>}
          </a>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="nav-cta">Get Started</button>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
