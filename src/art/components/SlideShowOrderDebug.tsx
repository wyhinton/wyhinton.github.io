import React from 'react';

interface SlideShowOrderDebugProps {
  media: { src: string; isVideo: boolean }[];
  currentIndex: number;
}

export default function SlideShowOrderDebug({ media, currentIndex }: SlideShowOrderDebugProps) {
  const getFileName = (src: string) => {
    return src.split('/').pop() || src;
  };

  const getFileType = (isVideo: boolean) => {
    return isVideo ? '🎥' : '🖼️';
  };

  return (
    <div 
    className="slide-show-debug-wrapper"
    style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '300px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 1000,
      border: '1px solid #ccc'
    }}>
      <div style={{ 
        marginBottom: '8px', 
        fontWeight: 'bold',
        borderBottom: '1px solid #555',
        paddingBottom: '5px'
      }}>
        Media Order ({media.length} items)
      </div>
      <div>
        {media.map((item, index) => (
          <div
            key={`${item.src}-${index}`}
            style={{
              padding: '3px 6px',
              marginBottom: '2px',
              borderRadius: '3px',
              backgroundColor: index === currentIndex ? '#007acc' : 'transparent',
              color: index === currentIndex ? 'white' : '#ccc',
              fontSize: '11px',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ flexShrink: 0 }}>
              {index + 1}.
            </span>
            <span style={{ flexShrink: 0 }}>
              {getFileType(item.isVideo)}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getFileName(item.src)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
