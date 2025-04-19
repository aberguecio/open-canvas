// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import ImageForm from '../components/ImageForm';
import ImageList from '../components/ImageList';
import { fetchImages, uploadImage, deleteImage } from '../services/ImageService';

interface Image {
  id: number;
  name: string;
  url: string;
}

const Home: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      const fetchedImages = await fetchImages();
      setImages(fetchedImages);
    };
    loadImages();
  }, []);

  const handleAddImage = async (name: string, file: File) => {
    const newImage = await uploadImage(name, file);
    setImages([newImage, ...images]);
  };

  const handleDeleteImage = async (id: number) => {
    await deleteImage(id);
    setImages(images.filter(image => image.id !== id));
  };

  return (
    <div>
      <h1>Galería de Imágenes</h1>
      <ImageForm onAddImage={handleAddImage} />
      <ImageList images={images} onDeleteImage={handleDeleteImage} />
    </div>
  );
};

export default Home;
