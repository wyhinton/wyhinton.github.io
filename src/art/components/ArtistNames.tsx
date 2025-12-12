import React, { useState } from 'react';
import { artistArray } from "../../generated/artistsManifest";
import SpritePlayback from './SpritePlayback';

// CSS for fade-in animation and tooltip
const fadeInStyle = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .artist-name-fade-in {
    animation: fadeIn 0.6s ease-out forwards;
  }

  .artist-tooltip {
    position: absolute;
    background-color: #333;
    color: #fff;
    padding: 0.75rem 1rem;
    border-radius: '8px';
    font-size: 0.85rem;
    white-space: nowrap;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    pointer-events: none;
  }

  .artist-tooltip a {
    color: #0066cc;
    text-decoration: none;
  }

  .artist-tooltip a:hover {
    text-decoration: underline;
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fadeInStyle;
  document.head.appendChild(style);
}

const SPRITE_OPTIONS = [
  { name: 'ice', path: 'assets/sprites/ice.png', rows: 9, cols: 1 },
  { name: 'puddle_medium', path: 'assets/sprites/puddle_medium.png', rows: 8, cols: 1 },
  { name: 'robber_splash', path: 'assets/sprites/robber_splash.png', rows: 7, cols: 1 }
];

function getRandomSprite() {
  return SPRITE_OPTIONS[Math.floor(Math.random() * SPRITE_OPTIONS.length)];
}


export default function ArtistNames() {
  const [hoveredArtist, setHoveredArtist] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [spriteMap, setSpriteMap] = useState<{ [key: string]: typeof SPRITE_OPTIONS[0] }>({});

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
        Artists
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
        {/* A curated collection of {artistArray.length} artists */}
      </p>
      {/* Artist Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '2rem 1rem'
      }}>
        {artistArray.map((artist, index) => (
          <div
            key={artist.Artist}
            style={{
              position: 'relative',
              animation: `fadeIn 0.6s ease-out forwards`,
              animationDelay: `${index * 0.05}s`
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({
                x: rect.left + rect.width / 2,
                y: rect.top - 10
              });
              setHoveredArtist(artist.Artist);
              
              // Assign random sprite if not already assigned
              if (!spriteMap[artist.Artist]) {
                setSpriteMap((prev) => ({
                  ...prev,
                  [artist.Artist]: getRandomSprite()
                }));
              }
            }}
            onMouseLeave={() => setHoveredArtist(null)}
          >
            {/* Sprite background on hover */}
            {hoveredArtist === artist.Artist && spriteMap[artist.Artist] && (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 0,
                  opacity: 1,
                  pointerEvents: 'none'
                }}
              >
                {/* <SpritePlayback
                  src={spriteMap[artist.Artist].path}
                  rows={spriteMap[artist.Artist].rows}
                  cols={spriteMap[artist.Artist].cols}
                  fps={24}
                  mode="loop"
                  width={120}
                  height={120}
                /> */}
              </div>
            )}

            <span
              style={{
                cursor: 'pointer',
                color: '#333',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'color 0.2s ease',
                position: 'relative',
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0066cc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#333';
              }}
            >
              {artist.Artist}
            </span>

            {/* Tooltip */}
            {hoveredArtist === artist.Artist && (artist.Instagram || artist.Bandcamp || artist.Notes) && (
              <div
                style={{
                  position: 'fixed',
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y}px`,
                  transform: 'translate(-50%, -100%)',
                  backgroundColor: '#333',
                  color: '#fff',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  zIndex: 1000,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  pointerEvents: 'none'
                }}
              >
                {artist.Instagram && (
                  <div style={{ marginBottom: artist.Bandcamp ? '0.5rem' : 0 }}>
                    <a
                      href={`https://instagram.com/${artist.Instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a8dadc', textDecoration: 'none' }}
                    >
                      @{artist.Instagram}
                    </a>
                  </div>
                )}
                {artist.Bandcamp && (
                  <div style={{ marginBottom: artist.Notes ? '0.5rem' : 0 }}>
                    <a
                      href={`https://bandcamp.com/search?q=${encodeURIComponent(artist.Bandcamp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#a8dadc', textDecoration: 'none' }}
                    >
                      {artist.Bandcamp}
                    </a>
                  </div>
                )}
                {artist.Notes && (
                  <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                    {artist.Notes}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
