import React, { useEffect, useRef } from 'react'
import './MouseFollower.css'

const MouseFollower = () => {
  const cursorRef = useRef(null)
  const cursorDotRef = useRef(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const cursorDot = cursorDotRef.current
    let mouseX = 0
    let mouseY = 0
    let cursorX = 0
    let cursorY = 0
    let dotX = 0
    let dotY = 0

    const handleMouseMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const handleMouseEnter = () => {
      cursor.style.opacity = '1'
      cursorDot.style.opacity = '1'
    }

    const handleMouseLeave = () => {
      cursor.style.opacity = '0'
      cursorDot.style.opacity = '0'
    }

    const handleLinkHover = () => {
      cursor.classList.add('cursor-hover')
      cursorDot.classList.add('cursor-dot-hover')
    }

    const handleLinkLeave = () => {
      cursor.classList.remove('cursor-hover')
      cursorDot.classList.remove('cursor-dot-hover')
    }

    const animate = () => {
      const speed = 0.15
      const dotSpeed = 0.3

      cursorX += (mouseX - cursorX) * speed
      cursorY += (mouseY - cursorY) * speed
      dotX += (mouseX - dotX) * dotSpeed
      dotY += (mouseY - dotY) * dotSpeed

      cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`
      cursorDot.style.transform = `translate(${dotX}px, ${dotY}px)`

      requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    const interactiveElements = document.querySelectorAll('a, button, .movie-card, .catalog-card, .genre-tab')
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleLinkHover)
      el.addEventListener('mouseleave', handleLinkLeave)
    })

    animate()

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleLinkHover)
        el.removeEventListener('mouseleave', handleLinkLeave)
      })
    }
  }, [])

  return (
    <>
      <div ref={cursorRef} className="mouse-cursor" />
      <div ref={cursorDotRef} className="mouse-cursor-dot" />
    </>
  )
}

export default MouseFollower
