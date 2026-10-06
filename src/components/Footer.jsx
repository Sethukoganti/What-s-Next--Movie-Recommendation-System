import React from 'react'
import LiveUpdateIndicator from './LiveUpdateIndicator'
import { Github, Twitter, Linkedin, Mail } from 'lucide-react'
import CineverseMark from './CineverseMark'
import './Footer.css'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <CineverseMark size={36} />
            <span>CineVerse</span>
          </div>
          <p className="footer-tagline">
            Your AI-powered gateway to discovering the perfect movie, every time.
          </p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>Explore</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#top-movies">Top Movies</a></li>
              <li><a href="#genres">Genres</a></li>
              <li><a href="#search">Search</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Resources</h4>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#api">API</a></li>
              <li><a href="#blog">Blog</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Legal</h4>
            <ul>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#cookies">Cookie Policy</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-social">
          <h4>Connect With Us</h4>
          <div className="social-icons">
            <a href="#github" aria-label="GitHub"><Github size={20} /></a>
            <a href="#twitter" aria-label="Twitter"><Twitter size={20} /></a>
            <a href="#linkedin" aria-label="LinkedIn"><Linkedin size={20} /></a>
            <a href="#email" aria-label="Email"><Mail size={20} /></a>
          </div>
        </div>
      </div>

      <div className="footer-live"><LiveUpdateIndicator /></div>
      <div className="footer-bottom">
        <p>&copy; {currentYear} CineVerse. All rights reserved. Powered by AI & Machine Learning.</p>
      </div>
    </footer>
  )
}

export default Footer
