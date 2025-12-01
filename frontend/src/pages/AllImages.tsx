// src/pages/AllImages.tsx
import { useEffect, useState } from 'react';
import {
  fetchAllImages,
  deleteImage,
  addFavorite,
  delFavorite,
  requeueImage,
  flagImage,
  Image
} from '../services/ImageService';
import ImageList from '../components/ImageList';
import { useAuth } from '../contexts/AuthContext';

export default function AllImages() {
  const [images, setImages] = useState<Image[]>([]);
  const { userEmail } = useAuth();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;

  useEffect(() => {
    fetchAllImages().then(setImages).catch(console.error);
  }, []);

  const refresh = () => fetchAllImages().then(setImages);

  const handleDelete   = (id: number) => deleteImage(id).then(refresh);
  const handleFav      = (id: number) => addFavorite(id).then(refresh);
  const handleUnFav    = (id: number) => delFavorite(id).then(refresh);
  const handleRequeue  = (id: number) => requeueImage(id).then(refresh);

  const handleFlag = async (id: number) => {
    const reason = prompt('Reason for flagging:');
    if (reason === null) return;
    await flagImage(id, reason);
    refresh();
  };

  return (
    <ImageList
      images={images}
      onDeleteImage={handleDelete}
      onAddFav={handleFav}
      onRemoveFav={handleUnFav}
      onRequeue={handleRequeue}
      onFlag={handleFlag}
      showAdminActions
      showcurrent = {true}
      currentUser={userEmail}
      adminEmail={adminEmail}
    />
  );
}
