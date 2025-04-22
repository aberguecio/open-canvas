// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import ImageForm from '../components/ImageForm';
import ImageList from '../components/ImageList';
import { fetchImages, uploadImage, deleteImage, setAuthToken, Image } from '../services/ImageService';

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;

interface GooglePayload {
  email: string;
  // ...otros campos que necesites
}

export default function Home() {
  const [images, setImages] = useState<Image[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchImages().then(setImages).catch(console.error);
  }, []);

  const handleLogin = (res: CredentialResponse) => {
    if (res.credential) {
      const jwt = res.credential;
      const payload = jwtDecode<GooglePayload>(jwt);
      setToken(jwt);
      setUserEmail(payload.email);
      setAuthToken(jwt);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail(null);
    setAuthToken(''); // limpia header
  };

  const handleAddImage = async (name: string, file: File) => {
    const newImg = await uploadImage(name, file);
    setImages(prev => [...prev, newImg]);
  };

  const handleDeleteImage = async (id: number) => {
    await deleteImage(id);
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div style={{ margin: '2% 10%', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
      <header style={{ margin: '0 10% 2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap'}}>
        <h1>Open‑Canvas</h1>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: "180px" }}>
          {!token ? (
            <GoogleLogin onSuccess={handleLogin} onError={() => console.log('Login Failed')} />
          ) : (
            <button onClick={handleLogout}>Cerrar sesión</button>
          )}
        </div>
      </header>

      {token && <ImageForm onAddImage={handleAddImage} />}

      <ImageList images={images}
        onDeleteImage={handleDeleteImage}
        currentUser={userEmail} 
        adminEmail={adminEmail}
        />
    </div>
  );
}
