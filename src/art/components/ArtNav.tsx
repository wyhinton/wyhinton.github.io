import React, { useState } from 'react';
import SpritePlayback from './SpritePlayback';

interface ArtNavProps {
  currentPage: 'work' | 'curation';
  onPageChange: (page: 'work' | 'curation') => void;
}

export default function ArtNav({ currentPage, onPageChange }: ArtNavProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const navStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    padding: '2rem 0',
    borderBottom: '1px solid #e5e5e5',
    marginBottom: '2rem'
  };

  const buttonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    color: '#666'
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    color: '#333',
    backgroundColor: '#f0f0f0',
    fontWeight: '600'
  };

  const buttonContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const spriteStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    opacity: 0.3
  };

  const activeButtonStyleWithSprite: React.CSSProperties = {
    ...activeButtonStyle,
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'transparent'
  };

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '2rem 1rem 1rem 1rem',
        position: 'relative',
        alignItems: 'center',
        justifyItems: 'center',
        width: "100%"
      }}>
        <div style={{maxWidth: '800px'}}>
            {/* PNG fallback - shows until video loads */}
            <img
              src="/assets/LOGO_ART_NAME/logo_art_name.png"
              alt="Art Logo"
              style={{
                maxWidth: '-webkit-fill-available',
                height: 'auto',
                objectFit: 'contain',
                display: videoLoaded ? 'none' : 'block'
              }}
            />
            
            {/* Video element */}
            <video
              src="/assets/LOGO_ART_NAME/NAME_VIDEO_LOOP.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                maxWidth: '-webkit-fill-available',
                height: 'auto',
                objectFit: 'contain',
                display: videoLoaded ? 'block' : 'none'
              }}
              onCanPlayThrough={() => setVideoLoaded(true)}
              onError={() => {
                console.log('Video failed to load, keeping PNG fallback');
              }}
            />
        </div>
      </div>

      <nav style={navStyle}>
      <div style={buttonContainerStyle}>
        {currentPage === 'work' && (
          <div style={spriteStyle}>
            <SpritePlayback
              src="assets/sprites/ef_ta_liquid016_16.png"
              rows={4}
              cols={4}
              fps={24}
              mode="ping-pong"
              width={64}
              height={64}
            />
          </div>
        )}
        <button
          style={currentPage === 'work' ? activeButtonStyleWithSprite : buttonStyle}
          onClick={() => onPageChange('work')}
          onMouseEnter={(e) => {
            if (currentPage !== 'work') {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 'work') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          Work
        </button>
      </div>

      <div style={buttonContainerStyle}>
        {currentPage === 'curation' && (
          <div style={spriteStyle}>
            <SpritePlayback
              src="assets/sprites/ef_ta_liquid016_16.png"
              rows={4}
              cols={4}
              fps={24}
              mode="ping-pong"
              width={64}
              height={64}
            />
          </div>
        )}
        <button
          style={currentPage === 'curation' ? activeButtonStyleWithSprite : buttonStyle}
          onClick={() => onPageChange('curation')}
          onMouseEnter={(e) => {
            if (currentPage !== 'curation') {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 'curation') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          Curation
        </button>
      </div>
    </nav>
    </>
  );
}
