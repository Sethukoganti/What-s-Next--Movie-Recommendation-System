import { useEffect, useRef } from 'react';
export default function AmbientSound({ genre }) {
  const ctx = useRef(null);
  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx.current = new AudioCtx();
    const osc = ctx.current.createOscillator();
    const gain = ctx.current.createGain();
    osc.type = genre === 'Horror' ? 'triangle' : genre === 'Romance' ? 'sine' : 'sine';
    osc.frequency.value = genre === 'Horror' ? 110 : genre === 'Romance' ? 220 : 165;
    gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.current.destination);
    osc.start();
    return () => { osc.stop(); ctx.current.close(); };
  }, [genre]);
  return null;
}
