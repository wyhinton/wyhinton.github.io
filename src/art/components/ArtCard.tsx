import React from 'react';
import { ArtAsset } from '../../generated/artManifest';

interface ArtCardProps {
  asset: ArtAsset;
}

export default function ArtCard({ asset }: ArtCardProps) {

  // Generate display title from asset data
  const getDisplayTitle = () => {
    if (asset.date && asset.city) {
      const date = new Date(asset.date);
      return `${date.toLocaleDateString()} - ${asset.city}`;
    }
    return asset.slug.replace(/_/g, ' ').toUpperCase();
  };

  // Generate description from asset metadata
  const getDescription = () => {
    const parts: string[] = [];
    if (asset.city) parts.push(asset.city);
    if (asset.date) parts.push(new Date(asset.date).toLocaleDateString());
    if (asset.flags.length > 0) parts.push(asset.flags.join(', '));
    return parts.length > 0 ? parts.join(' • ') : 'Art piece';
  };

  // Generate tags from asset data
  const getTags = () => {
    const tags: string[] = [];
    if (asset.city) tags.push(asset.city.toLowerCase());
    if (asset.year) tags.push(asset.year.toString());
    if (asset.ext) tags.push(asset.ext.toUpperCase());
    if (asset.flags.length > 0) tags.push(...asset.flags.map(f => f.toLowerCase()));
    return tags;
  };

  // Check if asset is a video
  const isVideo = ['mp4', 'webm', 'mov'].includes(asset.ext.toLowerCase());

  return (
    <div style={{
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      border: '1px solid #e9ecef',
      transition: 'box-shadow 0.2s, border-color 0.2s'
    }}
  >
      {isVideo ? (
        <video
          controls={false}
          autoPlay={true}
          muted={true}
          loop={true}
          style={{
            width: '100%',
            objectFit: 'cover',
            backgroundColor: '#000'
          }}
          
        >
          <source src={asset.src} type={`video/${asset.ext}`} />
          Your browser does not support the video tag.
        </video>
      ) : (
        <img
          src={asset.src}
          alt={getDisplayTitle()}
          style={{
            width: '100%',
            objectFit: 'cover',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
        />
      )}
      <div style={{ padding: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
          {getDisplayTitle()}
        </h3>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.4' }}>
          {getDescription()}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {getTags().map((tag) => (
            <span
              key={tag}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                fontSize: '0.75rem',
                borderRadius: '1rem',
                border: '1px solid #e9ecef'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
