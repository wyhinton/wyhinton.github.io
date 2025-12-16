import React, { useState } from 'react';
import { workProjects } from '../../generated/workManifest';

export default function ArtWork() {
  const [selectedProject, setSelectedProject] = useState<string | null>(workProjects[0]?.id || null);
  const currentProject = workProjects.find(p => p.id === selectedProject);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '2rem', color: '#333' }}>
        Work
      </h1>
      
      {/* Project Navigation */}
      <nav style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '3rem',
        borderBottom: '2px solid #e5e5e5',
        paddingBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        {workProjects.map((project) => (
          <button
            key={project.id}
            onClick={() => setSelectedProject(project.id)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: selectedProject === project.id ? '600' : '500',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              color: selectedProject === project.id ? '#333' : '#666',
              borderBottom: selectedProject === project.id ? '3px solid #333' : 'none',
              transition: 'all 0.2s ease',
              marginBottom: '-1rem',
              paddingBottom: 'calc(0.5rem + 1rem)'
            }}
            onMouseEnter={(e) => {
              if (selectedProject !== project.id) {
                e.currentTarget.style.color = '#333';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedProject !== project.id) {
                e.currentTarget.style.color = '#666';
              }
            }}
          >
            {project.name}
          </button>
        ))}
      </nav>

      {/* Project Content */}
      {currentProject && (
        <div>
          <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
            A collection of my professional and creative projects
          </p>
          
          {/* Project Description */}
          {currentProject.description && (
            <p style={{
              color: '#666',
              marginBottom: '2rem',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              maxWidth: '800px'
            }}>
              {currentProject.description}
            </p>
          )}
          
          {/* Project Images */}
          {currentProject.images.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {currentProject.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${currentProject.name} - Image ${index + 1}`}
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
        </div>
      )}
    </div>
  );
}
