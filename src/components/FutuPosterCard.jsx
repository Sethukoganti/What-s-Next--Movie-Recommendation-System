import React from 'react';
import './FutuPosters.css';

export default function FutuPosterCard({ movie, onClick }) {
  const score = movie.TMDBRating || movie.score || 0;
  const pct = Math.round(score * 10);
  let rcolor = '#db2360';
  if (score >= 7) rcolor = '#21d07a';
  else if (score >= 5) rcolor = '#d4a843';

  return (
    <div
      className="card-glow card-glass"
      data-movie-id={movie.TmdbID || movie.id}
      data-media-type={movie.MediaType || movie.type}
      onClick={() => onClick && onClick(movie)}
      style={{ cursor: 'pointer' }}
    >
      <div className="card__poster" style={{ position: 'relative' }}>
        {movie.PosterCard || movie.Poster ? (
          <>
            <img
              className="card__blur"
              src={movie.Blur || movie.PosterSmall || movie.PosterCard}
              alt=""
              aria-hidden="true"
              loading="eager"
              style={{ filter: 'blur(8px) brightness(0.6)', position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
            />
            <img
              className="card__img is-lazy"
              src={movie.PosterSmall || movie.Poster}
              data-lazy={movie.PosterCard || movie.Poster}
              alt={movie.Movie || movie.title}
              loading="lazy"
              style={{ position: 'relative', zIndex: 1, width: '100%', display: 'block', borderRadius: '10px' }}
            />
          </>
        ) : (
          <div className="card__fallback" style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#ff164f', background: 'linear-gradient(135deg, #0a0a12, #1a0a20)' }} aria-hidden="true">
            <span>{(movie.Movie || movie.title || 'M').slice(0, 1).toUpperCase()}</span>
          </div>
        )}

        <span className="card__type-pill" style={{ position: 'absolute', top: 8, left: 8, zIndex: 3, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
          {movie.TypeLabel || (movie.MediaType === 'tv' ? 'Series' : 'Movie')}
        </span>

        {score ? (
          <div className="glow-ring" style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 3, filter: `drop-shadow(0 0 6px ${rcolor}) drop-shadow(0 0 12px ${rcolor}88)` }}>
            <svg viewBox="0 0 34 34" width="34" height="34" aria-hidden="true">
              <circle className="ring-track" cx="17" cy="17" r="15.5" pathLength="100" stroke="#333" strokeWidth="2.5" fill="none" />
              <circle className="ring-fill" cx="17" cy="17" r="15.5" pathLength="100" stroke={rcolor} strokeDasharray={`${pct},100`} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
            <span className="card__rating-score" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.7rem', fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{score.toFixed(1)}</span>
          </div>
        ) : null}
      </div>

      <div className="card__hover" style={{ padding: '14px', background: 'rgba(10,10,18,0.85)', backdropFilter: 'blur(12px)' }}>
        <h3 className="neon-title" style={{ fontSize: '1.05rem', marginBottom: '6px', lineHeight: 1.2 }}>{movie.Movie || movie.title}</h3>

        <div className="card__hover-meta" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', fontSize: '0.78rem', color: '#ccc' }}>
          {movie.Match !== undefined && <span className="holo-badge">{movie.Match}% Match</span>}
          {movie.Year && <span>{movie.Year}</span>}
          {movie.Runtime && <span>{movie.Runtime}m</span>}
          {movie.Seasons && <span>{movie.Seasons} season{movie.Seasons > 1 ? 's' : ''}</span>}
        </div>

        <div className="card__genre-list" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(movie.Genre ? movie.Genre.split(' · ') : (movie.genres || [])).slice(0, 3).map((g, i) => (
            <a key={i} className="card__genre" href="#" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#ddd', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', textDecoration: 'none' }}>{g.trim()}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
