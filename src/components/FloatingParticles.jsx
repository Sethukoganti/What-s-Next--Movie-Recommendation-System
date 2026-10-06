import React, { useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import './FloatingParticles.css'

const MAX_PARTICLES = 8000
const BASE_PARTICLE_COUNT = 5000

const FloatingParticles = () => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const particlesRef = useRef([])
  const trailsRef = useRef([]); // previous positions for fading trails
  const mouseRef = useRef({ x: 0, y: 0 })
  const { theme } = useTheme()

  // Compute particle count based on screen size, capped at MAX_PARTICLES
  const computeParticleCount = useCallback(() => {
    const area = window.innerWidth * window.innerHeight
    const count = Math.min(Math.floor(area / 1500), MAX_PARTICLES)
    return Math.max(count, BASE_PARTICLE_COUNT)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    let particles = []
    let width = window.innerWidth
    let height = window.innerHeight

    const resizeCanvas = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Mouse tracking
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    document.addEventListener('mousemove', handleMouseMove)

    class Particle {
      constructor(index) {
        this.index = index
        this.reset()
        // Stagger initial positions
        this.x = Math.random() * width
        this.y = Math.random() * height
      }

      reset() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.size = Math.random() * 1.5 + 0.5
        this.baseSpeedX = (Math.random() - 0.5) * 0.3
        this.baseSpeedY = (Math.random() - 0.5) * 0.3
        this.opacity = Math.random() * 0.5 + 0.2
        this.pulsePhase = Math.random() * Math.PI * 2
        this.pulseSpeed = Math.random() * 0.02 + 0.005
        this.originalOpacity = this.opacity
      }

      update(time) {
        const mouse = mouseRef.current
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const influenceRadius = 150

        // Mouse attraction/repulsion
        if (dist < influenceRadius && dist > 0) {
          const force = (influenceRadius - dist) / influenceRadius
          const angle = Math.atan2(dy, dx)
          // Attract particles slightly toward mouse
          const attractStrength = force * 0.02
          this.baseSpeedX += Math.cos(angle) * attractStrength
          this.baseSpeedY += Math.sin(angle) * attractStrength
        }

        // Damping
        this.baseSpeedX *= 0.99
        this.baseSpeedY *= 0.99

        // Apply speed
        this.x += this.baseSpeedX
        this.y += this.baseSpeedY

        // Wrap around edges
        if (this.x < 0) this.x = width
        if (this.x > width) this.x = 0
        if (this.y < 0) this.y = height
        if (this.y > height) this.y = 0

        // Pulsing opacity
        this.pulsePhase += this.pulseSpeed
        this.opacity = this.originalOpacity * (0.7 + 0.3 * Math.sin(this.pulsePhase))
      }

      draw() {
        const color = theme === 'dark' ? '255, 22, 79' : '217, 7, 70'
        ctx.fillStyle = `rgba(${color}, ${this.opacity})`
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const init = () => {
      particles = []
      const count = computeParticleCount()
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(i))
      }
    }

    // Spatial grid for efficient connection line computation
    const createGrid = () => {
      const cellSize = 100
      const grid = {}
      particles.forEach((p, i) => {
        const cx = Math.floor(p.x / cellSize)
        const cy = Math.floor(p.y / cellSize)
        const key = `${cx},${cy}`
        if (!grid[key]) grid[key] = []
        grid[key].push(i)
      })
      return { grid, cellSize }
    }

    const drawConnections = () => {
      const { grid, cellSize } = createGrid()
      const connectionDist = 100
      const connectionDistSq = connectionDist * connectionDist

      const processed = new Set()
      const color = theme === 'dark' ? '255, 22, 79' : '217, 7, 70'

      for (const key in grid) {
        const [cx, cy] = key.split(',').map(Number)
        const indices = grid[key]

        // Check current cell and neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighborKey = `${cx + dx},${cy + dy}`
            const neighbors = grid[neighborKey]
            if (!neighbors) continue

            for (const i of indices) {
              for (const j of neighbors) {
                if (i >= j) continue
                const pairKey = `${i}-${j}`
                if (processed.has(pairKey)) continue
                processed.add(pairKey)

                const p1 = particles[i]
                const p2 = particles[j]
                const ddx = p1.x - p2.x
                const ddy = p1.y - p2.y
                const distSq = ddx * ddx + ddy * ddy

                if (distSq < connectionDistSq) {
                  const dist = Math.sqrt(distSq)
                  const alpha = 0.06 * (1 - dist / connectionDist)
                  ctx.strokeStyle = `rgba(${color}, ${alpha})`
                  ctx.lineWidth = 0.5
                  ctx.beginPath()
                  ctx.moveTo(p1.x, p1.y)
                  ctx.lineTo(p2.x, p2.y)
                  ctx.stroke()
                }
              }
            }
          }
        }
      }
    }

    // Mouse interaction glow
    const drawMouseGlow = () => {
      const mouse = mouseRef.current
      const gradient = ctx.createRadialGradient(
        mouse.x, mouse.y, 0,
        mouse.x, mouse.y, 200
      )
      const color = theme === 'dark' ? '255, 22, 79' : '217, 7, 70'
      gradient.addColorStop(0, `rgba(${color}, 0.08)`)
      gradient.addColorStop(1, `rgba(${color}, 0)`)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2)
      ctx.fill()
    }

    const animate = (time) => {
      ctx.clearRect(0, 0, width, height)

      // Update all particles
      particles.forEach((p) => {
        p.update(time)
        p.draw()
      })

      // Draw connection lines using spatial grid
      drawConnections()

      // Draw mouse influence glow
      drawMouseGlow()

      animationFrameId = requestAnimationFrame(animate)
    }

    init()
    animationFrameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [theme, computeParticleCount])

  return <canvas ref={canvasRef} className="floating-particles" />
}

export default FloatingParticles
