import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Float, Stars } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, X, ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import MoviePoster3D from './MoviePoster3D'
import './Hero3D.css'

// TODO: Install post-processing for bloom & chromatic aberration:
// npm install @react-three/postprocessing @react-three/drei
// Import: import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
// Wrap Canvas contents with <EffectComposer><Bloom intensity={1.2} /><ChromaticAberration offset={[0.002, 0.001]} /></EffectComposer>

const posterConfig = [
  { id: 1, title: 'NEON DREAMS', position: [-5, 2, -3], rotation: [0, 0.3, 0], scale: 1.4, color: '#ff164f', year: '2026', rating: '8.7/10', genre: 'Sci-Fi / Thriller' },
  { id: 2, title: 'STAR VOID', position: [4.5, -1, -5], rotation: [0, -0.5, 0.15], scale: 1.2, color: '#9b2cff', year: '2025', rating: '9.2/10', genre: 'Space / Drama' },
  { id: 3, title: 'ECHO PROTOCOL', position: [-3, -2.5, -7], rotation: [0, 0.8, -0.1], scale: 1.6, color: '#ff4d8d', year: '2026', rating: '7.9/10', genre: 'Action / Mystery' },
  { id: 4, title: 'CRIMSON HEIGHT', position: [6, 3, -2], rotation: [0, -0.2, 0.25], scale: 1.1, color: '#ff164f', year: '2025', rating: '8.4/10', genre: 'Crime / Noir' },
  { id: 5, title: 'ZERO HOUR', position: [-6.5, 0.5, -6], rotation: [0, 0.6, 0.1], scale: 1.3, color: '#9b2cff', year: '2026', rating: '9.0/10', genre: 'War / Epic' },
  { id: 6, title: 'PHANTOM RISE', position: [2, 4, -8], rotation: [0, -0.7, -0.15], scale: 1.5, color: '#ff4d8d', year: '2025', rating: '8.1/10', genre: 'Fantasy / Horror' },
  { id: 7, title: 'ABYSSAL', position: [-4.5, -3.5, -4], rotation: [0, 0.15, 0.2], scale: 1.0, color: '#ff164f', year: '2026', rating: '7.5/10', genre: 'Deep Sea / Thriller' },
  { id: 8, title: 'PRISM FALL', position: [3.5, -3, -3.5], rotation: [0, -0.4, -0.2], scale: 1.25, color: '#9b2cff', year: '2025', rating: '8.8/10', genre: 'Animation / Experimental' },
]

// Dynamic point lights that follow cursor
const DynamicPointLights = ({ mousePosition }) => {
  const lightRef = useRef()
  const lightRef2 = useRef()

  useFrame((state) => {
    const time = state.clock.elapsedTime
    if (lightRef.current) {
      // Point light 1 gently follows mouse with delay
      const targetX = (mousePosition?.x || 0) * 3
      const targetY = (mousePosition?.y || 0) * 3
      lightRef.current.position.x += (targetX - lightRef.current.position.x) * 0.05
      lightRef.current.position.y += (targetY - lightRef.current.position.y) * 0.05
      lightRef.current.position.z = 3 + Math.sin(time * 0.5) * 0.5
      lightRef.current.color.setHex(0xff164f)
    }
    if (lightRef2.current) {
      lightRef2.current.position.x = -2 + Math.sin(time * 0.7) * 3
      lightRef2.current.position.y = 1 + Math.cos(time * 0.3) * 2
      lightRef2.current.position.z = 2 + Math.sin(time * 0.8) * 2
      lightRef2.current.color.setHex(0x9b2cff)
    }
  })

  return (
    <>
      <pointLight ref={lightRef} intensity={2} distance={20} decay={2} />
      <pointLight ref={lightRef2} intensity={1.5} distance={15} decay={2} />
    </>
  )
}

// Parallax depth layer component
const ParallaxLayer = ({ offsetFactor, zIndex, opacity = 0.08 }) => (
  <div
    className={`parallax-layer parallax-layer--${zIndex}`}
    style={{
      background: `radial-gradient(circle at ${20 + zIndex * 15}% ${30 + zIndex * 10}%, rgba(255,22,79,${opacity}) 0%, transparent 60%)`,
      transform: `translateY(${window.scrollY * offsetFactor}px)`,
    }}
  />
)

const Hero3D = () => {
  const [selectedPoster, setSelectedPoster] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [hoveredPoster, setHoveredPoster] = useState(null)
  const [scrollY, setScrollY] = useState(0)
  const canvasContainerRef = useRef(null)
  const { theme } = useTheme()

  // Mouse tracking for dynamic lights (normalized -1 to 1 relative to canvas center)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect()
        const cx = rect.width / 2
        const cy = rect.height / 2
        setMousePosition({
          x: ((e.clientX - rect.left) - cx) / cx,
          y: ((e.clientY - rect.top) - cy) / cy,
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Scroll tracking for parallax
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handlePosterClick = useCallback((id) => {
    // Toggle: if same poster clicked again, close; else open
    setSelectedPoster((prev) => (prev === id ? null : id))
  }, [])

  const handleCloseOverlay = () => setSelectedPoster(null)

  const selectedData = posterConfig.find(p => p.id === selectedPoster)

  return (
    <section id="home" className="hero-section">
      {/* Parallax depth layers */}
      <div className="parallax-container">
        <ParallaxLayer offsetFactor={0.05} zIndex={1} opacity={0.06} />
        <ParallaxLayer offsetFactor={0.1} zIndex={2} opacity={0.08} />
        <ParallaxLayer offsetFactor={0.15} zIndex={3} opacity={0.05} />
        <ParallaxLayer offsetFactor={0.2} zIndex={4} opacity={0.07} />
        <ParallaxLayer offsetFactor={0.25} zIndex={5} opacity={0.04} />
        <ParallaxLayer offsetFactor={0.3} zIndex={6} opacity={0.06} />
      </div>

      {/* Bloom glow overlay */}
      <div className="bloom-glow" />
      <div className="chromatic-aberration" />

      {/* 3D Canvas */}
      <div className="hero-canvas" ref={canvasContainerRef}>
        <Canvas gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }} camera={{ position: [0, 0, 5], fov: 50 }}
          camera={{ position: [0, 0, 5], fov: 75 }}
          gl={{ antialias: true, alpha: true }}
          shadows
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          <DynamicPointLights mousePosition={mousePosition} />

          {/* Floating stars background */}
          <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

          {/* Dynamic lighting: point lights that follow cursor via context/refs */}
          <group>
            {posterConfig.map((post) => (
              <MoviePoster3D
                key={post.id}
                data={post}
                mousePosition={mousePosition}
                onClick={handlePosterClick}
                isPulledOut={selectedPoster}
                isHovered={hoveredPoster === post.id}
              />
            ))}
          </group>

          {/* Orbit controls with constraints */}
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
            autoRotate
            autoRotateSpeed={0.5}
          />

          {/* Post-processing wrapper comment */}
          {/*
            TODO: Once @react-three/postprocessing is installed, wrap with:
            <EffectComposer>
              <Bloom intensity={1.2} luminanceThreshold={0.1} luminanceSmoothing={0.9} />
              <ChromaticAberration offset={[0.002, 0.001]} />
            </EffectComposer>
          */}
        </Canvas>
      </div>

      {/* Hero content overlay */}
      <div className="hero-content">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="hero-text"
        >
          <h1 className="hero-title">
            Discover Your Next
            <br />
            <span className="gradient-text">Favorite Movie</span>
          </h1>
          <p className="hero-subtitle">
            Experience AI-powered movie recommendations tailored to your taste.
            Click any floating poster to explore.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => document.getElementById('top-movies')?.scrollIntoView({ behavior: 'smooth' })}>
              <Play size={20} fill="currentColor" />
              Explore Now
            </button>
            <button className="btn-secondary" onClick={() => document.getElementById('genres')?.scrollIntoView({ behavior: 'smooth' })}>
              <Info size={20} />
              Learn More
            </button>
          </div>
        </motion.div>
      </div>

      {/* Poster click-to-pull-out detail overlay */}
      <AnimatePresence>
        {selectedPoster && selectedData && (
          <motion.div
            key="poster-detail"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="poster-overlay"
          >
            <div
              className="poster-detail-card"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderColor: selectedData.color,
                boxShadow: `0 0 30px ${selectedData.color}44`,
              }}
            >
              <button
                className="poster-close-btn"
                onClick={handleCloseOverlay}
                aria-label="Close"
              >
                <X size={14} />
              </button>
              <h3 style={{ color: selectedData.color }}>{selectedData.title}</h3>
              <p>
                {selectedData.genre} &mdash; {selectedData.year}
              </p>
              <div className="poster-meta">
                <span className="poster-rating">{selectedData.rating}</span>
                <span className="poster-year">{selectedData.year}</span>
                <ChevronRight size={14} color={selectedData.color} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll indicator */}
      <div className="scroll-indicator" style={{ zIndex: 2 }}>
        <div className="mouse">
          <div className="wheel"></div>
        </div>
        <p>Scroll to explore 3D posters</p>
      </div>

      {/* Floating poster cards (parallax DOM layer) */}
      <div className="floating-poster-cards" aria-hidden="true">
        {posterConfig.map((post, i) => (
          <div
            key={`bg-${post.id}`}
            className="floating-poster-bg"
            style={{
              top: `${15 + i * 12}%`,
              left: `${10 + (i % 3) * 30}%`,
              width: `${120 + i * 30}px`,
              height: `${180 + i * 40}px`,
              transform: `translateY(${scrollY * (0.05 + i * 0.03)}px) rotate(${i * 3}deg)`,
              opacity: 0.08 + i * 0.01,
              zIndex: i,
            }}
          >
            <div className="floating-poster-bg__img" style={{ background: `linear-gradient(135deg, ${post.color}55, ${post.color}22)` }} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default Hero3D
