// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import ImageForm from '../components/ImageForm';
import ImageList from '../components/ImageList';
import {
  fetchImages,
  uploadImage,
  deleteImage,
  Image,
} from '../services/ImageService';

const Home: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    fetchImages().then(setImages).catch(console.error);
  }, []);

  const handleAddImage = async (name: string, file: File) => {
    const newImg = await uploadImage(name, file);
    setImages(prev => [newImg, ...prev]);
  };

  const handleDeleteImage = async (id: number) => {
    await deleteImage(id);
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div style={{margin: "5% 10%", padding: '2rem', flexDirection: 'column'}}>
      <h1 style={{margin: "0 10%"}}>Open-Paper</h1>
      <ImageForm onAddImage={handleAddImage} />
      <ImageList images={images} onDeleteImage={handleDeleteImage} />
    </div>
  );
};

export default Home;
