import React from 'react';
import { StoreProvider } from 'easy-peasy';
import { store } from './store/store';
import ArtGallery from './components/ArtGallery';

export default function App() {
  return (
    <StoreProvider store={store}>
      <div className="min-h-screen bg-gray-900 text-white">
        <ArtGallery />
      </div>
    </StoreProvider>
  );
}
