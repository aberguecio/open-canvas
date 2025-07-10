import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import ImageForm from '../components/ImageForm';
import ImageList from '../components/ImageList';
import {
  fetchImages,
  uploadImage,
  deleteImage,
  setAuthToken,
  Image
} from '../services/ImageService';
import '../App.css';

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;

interface GooglePayload {
  email: string;
}

export default function Home() {
  const [images, setImages] = useState<Image[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Rehidrata sesión
    const storedToken = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('userEmail');
    const tokenExpiresAt = localStorage.getItem('tokenExpiresAt');

    if (storedToken && storedEmail && tokenExpiresAt) {
      const expiresInMs = 2 * 60 * 60 * 1000; // 2 horas
      const expiresAt = Number(tokenExpiresAt);

      if (Date.now() < expiresAt) {
        setToken(storedToken);
        setUserEmail(storedEmail);
        setAuthToken(storedToken);
      } else {
        // El token ha expirado
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('tokenExpiresAt');
      }
    }

    // Carga inicial de imágenes
    fetchImages().then(setImages).catch(console.error);
  }, []);

  const handleLogin = (res: CredentialResponse) => {
    if (!res.credential) return;
    const jwt = res.credential;
    const payload = jwtDecode<GooglePayload>(jwt);

    setToken(jwt);
    setUserEmail(payload.email);
    setAuthToken(jwt);

    // Almacenar el token y la fecha de expiración en localStorage
    const expiresInMs = 12 * 60 * 60 * 1000; // 12 horas
    const expiresAt = Date.now() + expiresInMs;
    localStorage.setItem('token', jwt);
    localStorage.setItem('userEmail', payload.email);
    localStorage.setItem('tokenExpiresAt', expiresAt.toString());
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail(null);
    setAuthToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('tokenExpiresAt');
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
    <div className="general-body">
      <header>
        <h1>Open-Canvas</h1>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px', colorScheme: "light" }}>
          {!token ? (
            <GoogleLogin onSuccess={handleLogin} onError={() => console.log('Login Failed')} theme="filled_black" />
          ) : (
            <button style={{minWidth: '200px'}} onClick={handleLogout}>Cerrar sesión</button>
          )}
        </div>
      </header>

      {token && <ImageForm onAddImage={handleAddImage} />}

      <ImageList
        images={images}
        onDeleteImage={handleDeleteImage}
        currentUser={userEmail}
        adminEmail={adminEmail}
        showcurrent = {true}
      />
    </div>
  );
}
