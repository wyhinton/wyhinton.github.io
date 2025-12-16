import React, { useState, useEffect } from 'react';
import ArtNav from './components/ArtNav';
import ArtGallery from './components/ArtGallery';
import ArtWork from './components/ArtWork';
import ArtHome from './components/ArtHome';
import Butterflies from './components/Butterflies';

type PageType = 'home' | 'work' | 'curation';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  // Handle URL-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1); // Remove the #
      if (hash === 'work' || hash === 'curation' || hash === 'home' || hash === '') {
        setCurrentPage(hash === '' ? 'home' : (hash as PageType));
      }
    };

    // Check initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL when page changes
  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    window.location.hash = page === 'home' ? '' : page;
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'work':
        return <ArtWork />;
      case 'curation':
        return <ArtGallery />;
      case 'home':
      default:
        return <ArtHome />;
    }
  };
  return (
    <>
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#333' }}>
      <Butterflies />
      <ArtNav currentPage={currentPage} onPageChange={handlePageChange} />
      {renderCurrentPage()}
    </div>
      </>
  );
}
