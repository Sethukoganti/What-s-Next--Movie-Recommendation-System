import React, { useEffect, useRef } from 'react';
const SoundDesign = () => {
  const ctxRef = useRef(null);
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const hover = (e) => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.01, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.08);
      };
      document.querySelectorAll('button, a, .movie-card').forEach(el => { el.addEventListener('mouseenter', hover); });
      return () => {};
    } catch (e) { console.log('Sound design unavailable'); }
  }, []);
  return null;
};
export default SoundDesign;
