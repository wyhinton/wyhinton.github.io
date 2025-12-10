import React, { useState } from 'react';
import { useStoreState, useStoreActions } from '../store/store';
import ArtCard from './ArtCard';
import { ArtPiece } from '../store/models/artModel';

export default function ArtGallery() {
  const pieces = useStoreState((state) => state.art.pieces);
  const addPiece = useStoreActions((actions) => actions.art.addPiece);
  const [showForm, setShowForm] = useState(false);

  const handleAddPiece = (piece: ArtPiece) => {
    addPiece(piece);
    setShowForm(false);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-5xl font-bold mb-4">Art Gallery</h1>
      <p className="text-gray-400 mb-8">A collection of visual works</p>

      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-8 px-6 py-2 bg-green-500 text-black font-semibold rounded hover:bg-green-400 transition-colors"
      >
        {showForm ? 'Cancel' : 'Add Piece'}
      </button>

      {showForm && (
        <AddPieceForm
          onAdd={handleAddPiece}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pieces.length === 0 ? (
          <p className="col-span-full text-gray-400 text-center py-12">
            No art pieces yet. Add one to get started!
          </p>
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
      className="bg-gray-800 p-6 rounded mb-8 border border-gray-700"
    >
      <input
        type="text"
        name="title"
        placeholder="Title"
        value={formData.title}
        onChange={handleChange}
        required
        className="w-full mb-4 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
      />
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        required
        className="w-full mb-4 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
      />
      <input
        type="url"
        name="imageUrl"
        placeholder="Image URL"
        value={formData.imageUrl}
        onChange={handleChange}
        required
        className="w-full mb-4 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
      />
      <input
        type="text"
        name="tags"
        placeholder="Tags (comma-separated)"
        value={formData.tags}
        onChange={handleChange}
        className="w-full mb-4 p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
      />
      <div className="flex gap-4">
        <button
          type="submit"
          className="px-6 py-2 bg-green-500 text-black font-semibold rounded hover:bg-green-400 transition-colors"
        >
          Add Piece
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
