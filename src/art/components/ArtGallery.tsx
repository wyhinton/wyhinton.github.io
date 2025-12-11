import React, { useState } from 'react';
import ArtCard from './ArtCard';
import { artAssets, ArtAsset } from "../../generated/artManifest";
import ArtistNames from './ArtistNames';

// CSS for fade-in animation
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

  .art-card-fade-in {
    animation: fadeIn 0.6s ease-out forwards;
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fadeInStyle;
  document.head.appendChild(style);
}

export default function ArtGallery() {
  // Sort artAssets by date (newest first)
  const sortedAssets = [...artAssets].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem' }}>
      <h2>Web has worked with many artists in a diverse range of genres. Curation is an important part of there practice</h2>
      <ArtistNames></ArtistNames>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
        Art Gallery
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
        A collection of {artAssets.length} visual works
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {sortedAssets.map((asset, index) => (
          <div
            key={asset.slug}
            className="art-card-fade-in"
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            <ArtCard asset={asset} />
          </div>
        ))}
      </div>
    </div>
  );
}
