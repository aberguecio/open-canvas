import React from 'react';

interface Image {
  id: number;
  name: string;
  url: string;
}

interface Props {
  images: Image[];
  onDeleteImage: (id: number) => void;
}

const ImageList: React.FC<Props> = ({ images, onDeleteImage }) => {
  return (
    <div>
      {images.map((image) => (
        <div key={image.id}>
          <p>{image.name}</p>
          <img src={image.url} alt={image.name} style={{ width: '200px' }} />
          <button onClick={() => onDeleteImage(image.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
};

export default ImageList;
