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
      {images.map(img => (
        <li
          key={img.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <img
            src={img.url}
            alt={img.name}
            style={{ maxHeight: 80, marginRight: '1rem', objectFit: 'cover' }}
          />
          <span style={{ flexGrow: 1 }}>{img.name}</span>
          <button onClick={() => onDeleteImage(img.id)}>Eliminar</button>
        </li>
      ))}
    </ul>
  );
};

export default ImageList;
