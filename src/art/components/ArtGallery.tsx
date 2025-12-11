import React, { useState } from 'react';
import ArtCard from './ArtCard';
import { artAssets, ArtAsset } from "../../generated/artManifest";

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
        {sortedAssets.map((asset) => (
          <ArtCard key={asset.slug} asset={asset} />
        ))}
      </div>
    </div>
  );
}
