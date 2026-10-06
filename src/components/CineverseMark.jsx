import React from 'react'

const CineverseMark = ({ size = 34, className = '' }) => (
  <svg
    className={`cineverse-mark ${className}`}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      className="cineverse-mark__orbit"
      d="M8.5 31.5C3.5 22.8 7 12.2 15.8 7.2c8.7-5 19.6-2.1 24.6 6.6 5 8.7 1.9 19.5-6.8 24.5-8.7 5-19.9 1.9-24.9-6.8Z"
    />
    <path className="cineverse-mark__frame" d="m14 15 15 8.6-15 8.7V15Z" />
    <path className="cineverse-mark__spark" d="m35.5 9.5 1.1 3.9 3.9 1.1-3.9 1.1-1.1 3.9-1.1-3.9-3.9-1.1 3.9-1.1 1.1-3.9Z" />
    <circle className="cineverse-mark__dot" cx="39" cy="35" r="2.5" />
  </svg>
)

export default CineverseMark