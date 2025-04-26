// src/pages/Favorites.tsx
import React, { useEffect, useState } from 'react';
import {
  fetchFavorites,
  deleteImage,
  delFavorite,
  requeueImage,
  Image
} from '../services/ImageService';
import ImageList from '../components/ImageList';

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;

export default function Favorites() {
  const [images, setImages] = useState<Image[]>([]);
  const currentUser = localStorage.getItem('userEmail');

  useEffect(() => {
    fetchFavorites().then(setImages).catch(console.error);
  }, []);

  const refresh = () => fetchFavorites().then(setImages);

  return (
    <ImageList
      images={images}
      onDeleteImage={id => deleteImage(id).then(refresh)}
      onRemoveFav={id => delFavorite(id).then(refresh)}
      onRequeue={id => requeueImage(id).then(refresh)}
      showAdminActions
      hideAddFav
      currentUser={currentUser}
      adminEmail={adminEmail}
    />
  );
}
