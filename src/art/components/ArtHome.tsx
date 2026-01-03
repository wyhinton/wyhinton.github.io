import React from 'react';
import HomeImageDisplay from './HomeImageDisplay';

export default function ArtHome() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 200px)',
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background fading image gallery - behind everything */}
      <HomeImageDisplay />

      {/* Logo container - layered on top */}
      <div style={{
        minWidth: '800px',
        zIndex: 2
      }}>
        <img
          src="/assets/LOGO_ART_NAME/logo_art_name.png"
          alt="Art Home"
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  );
}
