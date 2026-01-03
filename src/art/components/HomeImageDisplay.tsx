import React, { useState, useEffect } from 'react';
import { artAssets } from '../../generated/artManifest';
import { workProjects } from '../../generated/workManifest';
import SlideShowOrderDebug from './SlideShowOrderDebug';

interface HomeImageDisplayProps {
  style?: React.CSSProperties;
}

// Test flag to ensure alternating video/non-video display
const TEST_VIDEO_DISPLAY = false;

// Debug flag to show slideshow order
const SHOW_DEBUG = true;

export default function HomeImageDisplay({ style }: HomeImageDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [shuffledImages, setShuffledImages] = useState<{ src: string; isVideo: boolean }[]>([]);
  const [isMediaReady, setIsMediaReady] = useState(false);

  // Helper function to determine if a file is a video
  const isVideoFile = (src: string) => {
    const ext = src.split('.').pop()?.toLowerCase() || '';
    return ['mp4', 'webm', 'mov', 'avi'].includes(ext);
  };

  // Combine images and videos from both art assets and work projects
  const artMedia = artAssets.filter(asset => 
    ['png', 'jpg', 'jpeg', 'webp', 'mp4', 'webm', 'mov', 'avi'].includes(asset.ext.toLowerCase())
  ).map(asset => ({ 
    src: asset.src, 
    isVideo: isVideoFile(asset.src)
  }));

  const workMedia = workProjects.flatMap(project => 
    project.images.map(imagePath => ({ 
      src: imagePath, 
      isVideo: isVideoFile(imagePath)
    }))
  );

  const allMedia = [...artMedia, ...workMedia];

  // Shuffle function
  const shuffleArray = (array: { src: string; isVideo: boolean }[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Create alternating video/non-video sequence when TEST_VIDEO_DISPLAY is enabled
  const createAlternatingMedia = (media: { src: string; isVideo: boolean }[]) => {
    if (!TEST_VIDEO_DISPLAY) {
      return shuffleArray(media);
    }

    const videos = media.filter(item => item.isVideo);
    const nonVideos = media.filter(item => !item.isVideo);
    
    // Shuffle both arrays separately
    const shuffledVideos = shuffleArray(videos);
    const shuffledNonVideos = shuffleArray(nonVideos);
    
    const result: { src: string; isVideo: boolean }[] = [];
    const maxLength = Math.max(shuffledVideos.length, shuffledNonVideos.length);
    
    for (let i = 0; i < maxLength; i++) {
      // Add non-video first (even indices)
      if (i < shuffledNonVideos.length) {
        result.push(shuffledNonVideos[i]);
      }
      // Then add video (odd indices)
      if (i < shuffledVideos.length) {
        result.push(shuffledVideos[i]);
      }
    }
    
    return result;
  };

  // Initialize shuffled media on mount
  useEffect(() => {
    if (allMedia.length > 0) {
      setShuffledImages(createAlternatingMedia(allMedia));
    }
  }, []);

  const images = shuffledImages;

  useEffect(() => {
    if (images.length === 0 || !isMediaReady) return;

    // Fade in for 3 seconds, fade out for 2 seconds
    const fadeInTimer = setTimeout(() => {
      setFade(false);
    }, 3000);

    const transitionTimer = setTimeout(() => {
      setCurrentImageIndex((prev) => {
        const nextIndex = prev + 1;
        // If we've reached the end, reshuffle and start over
        if (nextIndex >= images.length) {
          setShuffledImages(createAlternatingMedia(allMedia));
          return 0;
        }
        return nextIndex;
      });
      setFade(true);
      setIsMediaReady(false); // Reset ready state for next media
    }, 5000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(transitionTimer);
    };
  }, [currentImageIndex, images.length, allMedia, isMediaReady]);

  if (images.length === 0) {
    return null;
  }

  const currentMedia = images[currentImageIndex];
  
  const handleMediaReady = () => {
    setIsMediaReady(true);
  };

  const baseStyle = {
    maxWidth: '800px',
    width: 'auto',
    height: 'auto',
    opacity: fade && isMediaReady ? 1 : 0,
    transition: 'opacity 2s ease-in-out',
    zIndex: 0,
    pointerEvents: 'none' as const,
    ...style
  };

  if (currentMedia.isVideo) {
    return (
      <>
        <video
          src={currentMedia.src}
          muted
          loop
          autoPlay
          playsInline
          onCanPlay={handleMediaReady}
          style={baseStyle}
        />
        {SHOW_DEBUG && (
          <SlideShowOrderDebug 
            media={images} 
            currentIndex={currentImageIndex} 
          />
        )}
      </>
    );
  }

  return (
    <>
      <img
        src={currentMedia.src}
        alt="Background"
        onLoad={handleMediaReady}
        style={baseStyle}
      />
      {SHOW_DEBUG && (
        <SlideShowOrderDebug 
          media={images} 
          currentIndex={currentImageIndex} 
        />
      )}
    </>
  );
}
