import React, { useEffect, useRef } from 'react';
import './CustomCursor.css';
const CustomCursor = () => {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    let mx = 0, my = 0, cx = 0, cy = 0, dx = 0, dy = 0;
    const onMove = e => { mx = e.clientX; my = e.clientY; };
    document.addEventListener('mousemove', onMove, { passive: true });
    const loop = () => {
      cx += (mx - cx) * 0.14; cy += (my - cy) * 0.14;
      dx += (mx - dx) * 0.35; dy += (my - dy) * 0.35;
      if (cursor) cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(1)`;
      if (dot) dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    return () => document.removeEventListener('mousemove', onMove);
  }, []);
  return (
    <>
      <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
    </>
  );
};
export default CustomCursor;
