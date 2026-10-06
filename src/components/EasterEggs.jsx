import React, { useEffect, useState } from 'react';

const EasterEggs = () => {
  const [matrix, setMatrix] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  useEffect(() => {
    const keys = [];
    const handleKey = (e) => {
      keys.push(e.key);
      if (keys.length > 10) keys.shift();
      const konami = 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a';
      if (keys.join(',') === konami) { setMatrix(true); setTimeout(() => setMatrix(false), 10000); }
      if (e.key === 'c' && keys.slice(-6).join('') === 'cinema') { setConfetti(true); setTimeout(() => setConfetti(false), 3000); }
      if (e.ctrlKey && e.shiftKey && e.key === 'd') { setDevMode(s => !s); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const logo = document.querySelector('.nav-logo');
    if (!logo) return;
    const onClick = () => { setLogoClicks(c => { const n = c + 1; if (n >= 10) { setMatrix(true); setTimeout(() => setMatrix(false), 8000); return 0; } return n; }); };
    logo.addEventListener('click', onClick);
    return () => logo.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      {matrix && (
        <div style={{ position:'fixed', inset:0, zIndex:99999, pointerEvents:'none', background:'#050a05', opacity:0.95 }}>
          <canvas id="matrix-canvas" style={{ width:'100%', height:'100%' }} />
        </div>
      )}
      {confetti && (
        <div style={{ position:'fixed', inset:0, zIndex:99999, pointerEvents:'none', overflow:'hidden' }}>
          {Array.from({length:40}).map((_,i) => (
            <span key={i} style={{ position:'absolute', left:`${Math.random()*100}%`, top:`-${Math.random()*20+10}%`, color:['#ff164f','#00f5ff','#39ff14','#bc13fe'][i%4], fontSize:`${Math.random()*20+10}px`, animation:`fall ${Math.random()*3+2}s linear forwards`, animationDelay:`${Math.random()*1}s` }}>{String.fromCharCode(9733)}</span>
          ))}
        </div>
      )}
      {devMode && (
        <div style={{ position:'fixed', bottom:20, left:20, zIndex:9999, background:'rgba(0,0,0,0.8)', color:'#39ff14', padding:'10px 14px', borderRadius:8, fontFamily:'monospace', fontSize:'12px' }}>
          FPS: 60 | Dev Mode ON | Matrix: {matrix ? 'ON' : 'OFF'}
        </div>
      )}
      <style>{`
        @keyframes fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
      `}</style>
    </>
  );
};
export default EasterEggs;
