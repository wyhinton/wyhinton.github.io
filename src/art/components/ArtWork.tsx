import React from 'react';
import { workProjects } from '../../generated/workManifest';

export default function ArtWork() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
        Work
      </h1>
      <p style={{ color: '#666', marginBottom: '4rem', fontSize: '1.1rem' }}>
        A collection of my professional and creative projects
      </p>
      
      {/* Project Sections */}
      {workProjects.map((project) => (
        <div key={project.id} style={{ marginBottom: '5rem' }}>
          {/* Project Title */}
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            color: '#333'
          }}>
            {project.name}
          </h2>
          
          {/* Project Description */}
          {project.description && (
            <p style={{
              color: '#666',
              marginBottom: '2rem',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              maxWidth: '800px'
            }}>
              {project.description}
            </p>
          )}
          
          {/* Project Images */}
          {project.images.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {project.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${project.name} - Image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                />
              ))}
            </div>
          ) : (
            <p style={{
              color: '#999',
              fontSize: '1rem',
              marginBottom: '2rem'
            }}>
              No images available for this project
            </p>
          )}
          
          {/* Separator line */}
          {workProjects.indexOf(project) < workProjects.length - 1 && (
            <hr style={{
              border: 'none',
              borderTop: '1px solid #eee',
              marginTop: '3rem'
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
