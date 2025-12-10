import React from 'react';
import { useStoreActions } from '../store/store';
import { ArtPiece } from '../store/models/artModel';

interface ArtCardProps {
  piece: ArtPiece;
}

export default function ArtCard({ piece }: ArtCardProps) {
  const selectPiece = useStoreActions((actions) => actions.art.selectPiece);
  const removePiece = useStoreActions((actions) => actions.art.removePiece);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #e9ecef',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'box-shadow 0.2s, border-color 0.2s'
    }}
    onMouseOver={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = '#69ff5e';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }}
    onMouseOut={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = '#e9ecef';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    }}>
      <img
        src={piece.imageUrl}
        alt={piece.title}
        style={{
          width: '100%',
          height: '192px',
          objectFit: 'cover',
          cursor: 'pointer',
          transition: 'opacity 0.2s'
        }}
        onClick={() => selectPiece(piece)}
        onMouseOver={(e) => (e.target as HTMLElement).style.opacity = '0.8'}
        onMouseOut={(e) => (e.target as HTMLElement).style.opacity = '1'}
      />
      <div style={{ padding: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
          {piece.title}
        </h3>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.4' }}>
          {piece.description}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {piece.tags.map((tag) => (
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => selectPiece(piece)}
            style={{
              flex: '1',
              padding: '0.5rem 1rem',
              backgroundColor: '#69ff5e',
              color: '#000',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            View
          </button>
          <button
            onClick={() => removePiece(piece.id)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: '#fff',
              fontWeight: '600',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
