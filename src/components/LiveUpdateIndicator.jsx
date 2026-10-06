import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'
import './LiveUpdateIndicator.css'

export default function LiveUpdateIndicator() {
  const [lastUpdate, setLastUpdate] = useState(new Date())
  useEffect(() => { const iv = setInterval(() => setLastUpdate(new Date()), 30000); return () => clearInterval(iv) }, [])
  return (
    <div className="live-badge" aria-label="Live update indicator" role="status">
      <span className="live-dot"><span className="pulse-ring"></span></span>
      <span className="live-label"><Radio size={14} /> Live</span>
      <span className="live-time">Updated {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  )
}
