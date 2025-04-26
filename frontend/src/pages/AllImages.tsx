// src/pages/AllImages.tsx
import { useEffect, useState } from 'react';
import {
  fetchAllImages,
  deleteImage,
  addFavorite,
  delFavorite,
  requeueImage,
  Image
} from '../services/ImageService';
import ImageList from '../components/ImageList';

export default function AllImages() {
  const [images, setImages] = useState<Image[]>([]);
  const currentUser = localStorage.getItem('userEmail');
  const adminEmail = localStorage.getItem('adminEmail') || import.meta.env.VITE_ADMIN_EMAIL as string;

  useEffect(() => {
    fetchAllImages().then(setImages).catch(console.error);
  }, []);

  const refresh = () => fetchAllImages().then(setImages);

  const handleDelete   = (id: number) => deleteImage(id).then(refresh);
  const handleFav      = (id: number) => addFavorite(id).then(refresh);
  const handleUnFav    = (id: number) => delFavorite(id).then(refresh);
  const handleRequeue  = (id: number) => requeueImage(id).then(refresh);

  return (
    <ImageList
      images={images}
      onDeleteImage={handleDelete}
      onAddFav={handleFav}
      onRemoveFav={handleUnFav}
      onRequeue={handleRequeue}
      showAdminActions
      showcurrent = {true}
      currentUser={currentUser}
      adminEmail={adminEmail}
    />
  );
}
