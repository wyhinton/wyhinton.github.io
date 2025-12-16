import React, { useState, useEffect } from 'react';
import { artAssets } from '../../generated/artManifest';
import { workProjects } from '../../generated/workManifest';

export default function ArtHome() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [shuffledImages, setShuffledImages] = useState<{ src: string }[]>([]);

  // Combine images from both art assets and work projects
  const artImages = artAssets.filter(asset => 
    ['png', 'jpg', 'jpeg', 'webp'].includes(asset.ext.toLowerCase())
  ).map(asset => ({ src: asset.src }));

  const workImages = workProjects.flatMap(project => 
    project.images.map(imagePath => ({ src: imagePath }))
  );

  const allImages = [...artImages, ...workImages];

  // Shuffle function
  const shuffleArray = (array: { src: string }[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialize shuffled images on mount
  useEffect(() => {
    if (allImages.length > 0) {
      setShuffledImages(shuffleArray(allImages));
    }
  }, []);

  const images = shuffledImages;

  useEffect(() => {
    if (images.length === 0) return;

    // Fade in for 3 seconds, fade out for 2 seconds
    const fadeInTimer = setTimeout(() => {
      setFade(false);
    }, 3000);

    const transitionTimer = setTimeout(() => {
      setCurrentImageIndex((prev) => {
        const nextIndex = prev + 1;
        // If we've reached the end, reshuffle and start over
        if (nextIndex >= images.length) {
          setShuffledImages(shuffleArray(allImages));
          return 0;
        }
        return nextIndex;
      });
      setFade(true);
    }, 5000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(transitionTimer);
    };
  }, [currentImageIndex, images.length, allImages]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 200px)',
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background fading image gallery - behind everything */}
      {images.length > 0 && (
        <img
          src={images[currentImageIndex].src}
          alt="Background"
          style={{
            maxWidth: '800px',
            width: 'auto',
            height: 'auto',
            opacity: fade ? 1 : 0,
            transition: 'opacity 2s ease-in-out',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Logo container - layered on top */}
      <div style={{
        minWidth: '800px',
        zIndex: 2
      }}>
        <img
          src="/assets/LOGO_ART_NAME/logo_art_name.png"
          alt="Art Home"
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  );
}
