import React from 'react';
import { StoreProvider } from 'easy-peasy';
import { store } from './store/store';
import ArtGallery from './components/ArtGallery';

export default function App() {
  return (
    <StoreProvider store={store}>
      <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#333' }}>
        <ArtGallery />
      </div>
    </StoreProvider>
  );
}
