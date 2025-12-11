import React from 'react';

export default function ArtWork() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
        Work
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
        Coming soon...
      </p>
      
      <div style={{
        padding: '3rem',
        backgroundColor: '#f8f8f8',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px dashed #ddd'
      }}>
        <p style={{ 
          color: '#999', 
          fontSize: '1.2rem',
          margin: 0
        }}>
          This section is under development
        </p>
      </div>
    </div>
  );
}
