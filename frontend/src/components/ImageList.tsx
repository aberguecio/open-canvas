// src/components/ImageList.tsx
import React from 'react';
import { Image } from '../services/ImageService';

interface Props {
  images: Image[];
  onDeleteImage: (id: number) => Promise<void>;
}

const ImageList: React.FC<Props> = ({ images, onDeleteImage }) => {
  if (images.length === 0) return <p>No hay imágenes para mostrar.</p>;

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {images.map((img, index) => (

        <li
          key={img.id}
          style={{
            display: 'flex',
            flexDirection: 'column', // apila imagen y contenido
            alignItems: 'center',
            marginBottom: '2rem',
            textAlign: 'center',
          }}
        >
          <img
            src={img.url}
            alt={img.name}
            style={{
              maxHeight: 500,
              maxWidth: '95%',
              marginBottom: '0.5rem',
              border: index === 0 ? '5px solid limegreen' : 'none',
              objectFit: 'cover'
            }}
          />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem' // espacio entre nombre y botón
          }}>
            {index === 0 && <strong style={{ color: 'limegreen', marginLeft: '0.5rem' }}>(Current)</strong>}
            <span>{img.name}</span>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              {new Date(img.createdAt).toLocaleDateString()}
            </span>
            <button onClick={() => onDeleteImage(img.id)}>Eliminar</button>
          </div>
        </li>

      ))}
    </ul>
  );
};

export default ImageList;
