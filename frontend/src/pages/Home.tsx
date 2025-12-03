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
  checkUserStatus,
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
  const [banError, setBanError] = useState<string | null>(null);
  const { token, userEmail, login, logout } = useAuth();

  useEffect(() => {
    fetchImages().then(setImages).catch(console.error);
  }, []);

  const handleLogin = async (res: CredentialResponse) => {
    if (!res.credential) return;
    const jwt = res.credential;
    const payload = jwtDecode<GooglePayload>(jwt);

    // Clear any previous ban error
    setBanError(null);

    // Attempt login
    login(jwt, payload.email);

    // Check if user is banned immediately after login
    try {
      await checkUserStatus();
    } catch (error) {
      // If check fails, the token might be invalid (user is banned)
      setBanError('You are banned from this service');
    }
  };

  const handleLogout = () => {
    setBanError(null);
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
        <h1>Canvas.Berguecio</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '150px', colorScheme: "light" }}>
            {!token ? (
              <GoogleLogin onSuccess={handleLogin} onError={() => console.log('Login Failed')} theme="filled_black" />
            ) : (
              <button style={{ minWidth: '150px', height: '33px' }} onClick={handleLogout}>Cerrar sesión</button>
            )}
          </div>
        </div>
      </header>

      {banError && (
        <div style={{
          padding: '1rem',
          margin: '1rem 0',
          backgroundColor: '#fee',
          border: '2px solid #c00',
          borderRadius: '8px',
          color: '#c00',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          🚫 {banError}
        </div>
      )}

      {token && <ImageForm onAddImage={handleAddImage} />}

      <ImageList
        images={images}
        onDeleteImage={handleDeleteImage}
        currentUser={userEmail}
        adminEmail={adminEmail}
        showcurrent={true}
      />
    </div>
  );
}
