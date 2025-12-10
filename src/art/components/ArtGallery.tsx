import React, { useState, useEffect } from 'react';
import { useStoreState, useStoreActions } from '../store/store';
import ArtCard from './ArtCard';
import { ArtPiece } from '../store/models/artModel';

export default function ArtGallery() {
  const pieces = useStoreState((state) => state.art.pieces);
  const addPiece = useStoreActions((actions) => actions.art.addPiece);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load art files automatically on component mount
  useEffect(() => {
    const loadArtFiles = async () => {
      try {
        // Use import.meta.glob to get all image and video files from assets/art
        const modules = import.meta.glob('/assets/art/*.{png,jpg,jpeg,gif,webp,mp4,webm,mov}', { 
          eager: true,
          as: 'url' 
        });
        
        // Convert file paths to art pieces
        Object.entries(modules).forEach(([path, url]) => {
          const filename = path.split('/').pop() || '';
          const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
          
          // Parse the filename to extract information
          const parts = nameWithoutExt.split('_');
          let title = nameWithoutExt.replace(/_/g, ' ');
          let tags = ['art'];
          
          // Try to extract date and location from filename pattern
          if (parts.length >= 4) {
            const month = parts[0];
            const day = parts[1];
            const year = parts[2];
            const location = parts.slice(3).join(' ');
            
            title = `${month} ${day}, ${year} - ${location}`;
            tags = ['art', location.toLowerCase(), year];
          }
          
          // Check if this piece already exists (avoid duplicates)
          const existingPiece = pieces.find(p => p.imageUrl === url || p.title === title);
          if (!existingPiece) {
            const artPiece: ArtPiece = {
              id: `auto-${Date.now()}-${Math.random()}`,
              title: title,
              description: `Artwork from ${title}`,
              imageUrl: url as string,
              tags: tags
            };
            
            addPiece(artPiece);
          }
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to load art files:', error);
        setLoading(false);
      }
    };

    // Only load if pieces array is empty to avoid loading on every render
    if (pieces.length === 0) {
      loadArtFiles();
    } else {
      setLoading(false);
    }
  }, [pieces.length, addPiece]);

  const handleAddPiece = (piece: ArtPiece) => {
    addPiece(piece);
    setShowForm(false);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
        Art Gallery
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
        A collection of visual works
      </p>

      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          marginBottom: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#69ff5e',
          color: '#000',
          fontWeight: '600',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '1rem',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#5ce653'}
        onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = '#69ff5e'}
      >
        {showForm ? 'Cancel' : 'Add Piece'}
      </button>

      {showForm && (
        <AddPieceForm
          onAdd={handleAddPiece}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {pieces.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              No art pieces yet. Add one to get started!
            </p>
          </div>
        ) : (
          pieces.map((piece) => <ArtCard key={piece.id} piece={piece} />)
        )}
      </div>
    </div>
  );
}

interface AddPieceFormProps {
  onAdd: (piece: ArtPiece) => void;
  onCancel: () => void;
}

function AddPieceForm({ onAdd, onCancel }: AddPieceFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    tags: '',
  });

  const inputStyle = {
    width: '100%',
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#ffffff',
    color: '#333',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    outline: 'none'
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      imageUrl: formData.imageUrl,
      tags: formData.tags.split(',').map((tag) => tag.trim()),
    });
    setFormData({ title: '', description: '', imageUrl: '', tags: '' });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        border: '1px solid #e9ecef',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <input
        type="text"
        name="title"
        placeholder="Title"
        value={formData.title}
        onChange={handleChange}
        required
        style={inputStyle}
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        required
        style={inputStyle}
      />
      <input
        type="url"
        name="imageUrl"
        placeholder="Image URL"
        value={formData.imageUrl}
        onChange={handleChange}
        required
        style={inputStyle}
      />
      <input
        type="text"
        name="tags"
        placeholder="Tags (comma-separated)"
        value={formData.tags}
        onChange={handleChange}
        style={inputStyle}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#69ff5e',
            color: '#000',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Add Piece
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6c757d',
            color: '#fff',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
