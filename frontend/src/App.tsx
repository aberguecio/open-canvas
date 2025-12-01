// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import AllImages from './pages/AllImages';
import Favorites from './pages/Favorites';
import Users from './pages/Users';
import FlaggedImages from './pages/FlaggedImages';
import SettingsPage from './pages/SettingsPage';
import { useAuth } from './contexts/AuthContext';
import AdminNav from './components/AdminNav';

export default function App() {
  const { isAdmin } = useAuth();

  return (
    <div>
      {/* Menú admin, visible en todas las páginas */}
      {isAdmin && <AdminNav />}

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

        <Route
          path="/users"
          element={isAdmin ? <Users /> : <Navigate to="/" replace />}
        />

        <Route
          path="/flagged"
          element={isAdmin ? <FlaggedImages /> : <Navigate to="/" replace />}
        />

        <Route
          path="/settings"
          element={isAdmin ? <SettingsPage /> : <Navigate to="/" replace />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
