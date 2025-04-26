// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Home from './pages/Home';
import AllImages from './pages/AllImages';
import Favorites from './pages/Favorites';
import { setAuthToken } from './services/ImageService';

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;

export default function App() {
  // Rehidratar token para todas las peticiones
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setAuthToken(token);
  }, []);

  const currentUser = localStorage.getItem('userEmail');
  const isAdmin     = currentUser === adminEmail;

  return (
    <div>
      {/* Menú admin, visible en todas las páginas */}
      {isAdmin && (
        <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
          <Link to="/" style={{ marginRight: '1rem' }}>Inicio</Link>
          <Link to="/all-images" style={{ marginRight: '1rem' }}>Todas</Link>
          <Link to="/favorites">Favoritos</Link>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/all-images"
          element={isAdmin ? <AllImages /> : <Navigate to="/" replace />}
        />

        <Route
          path="/favorites"
          element={isAdmin ? <Favorites /> : <Navigate to="/" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
