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
    <div className="bg-gray-800 rounded overflow-hidden border border-gray-700 hover:border-green-500 transition-colors">
      <img
        src={piece.imageUrl}
        alt={piece.title}
        className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => selectPiece(piece)}
      />
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2 text-white">{piece.title}</h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {piece.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {piece.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => selectPiece(piece)}
            className="flex-1 px-4 py-2 bg-green-500 text-black font-semibold rounded hover:bg-green-400 transition-colors text-sm"
          >
            View
          </button>
          <button
            onClick={() => removePiece(piece.id)}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-500 transition-colors text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
