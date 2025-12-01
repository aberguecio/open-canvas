import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import ImageForm from '../components/ImageForm';
import ImageList from '../components/ImageList';
import ThemeToggle from '../components/ThemeToggle';
import {
  fetchImages,
  uploadImage,
  deleteImage,
  Image
} from '../services/ImageService';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;

interface GooglePayload {
  email: string;
}

export default function Home() {
  const [images, setImages] = useState<Image[]>([]);
  const { token, userEmail, login, logout } = useAuth();

  useEffect(() => {
    // Carga inicial de imágenes
    fetchImages().then(setImages).catch(console.error);
  }, []);

  const handleLogin = (res: CredentialResponse) => {
    if (!res.credential) return;
    const jwt = res.credential;
    const payload = jwtDecode<GooglePayload>(jwt);
    login(jwt, payload.email);
  };

  const handleLogout = () => {
    logout();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px', colorScheme: "light" }}>
            {!token ? (
              <GoogleLogin onSuccess={handleLogin} onError={() => console.log('Login Failed')} theme="filled_black" />
            ) : (
              <button style={{minWidth: '200px'}} onClick={handleLogout}>Cerrar sesión</button>
            )}
          </div>
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
