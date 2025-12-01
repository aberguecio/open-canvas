import { Link, useLocation } from 'react-router-dom';
import './AdminNav.css';

export default function AdminNav() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="logo">Open Canvas - Admin</div>
      <div className="navLinks">
        <Link
          to="/"
          className={`navLink ${location.pathname === '/' ? 'active' : ''}`}
        >
          Inicio
        </Link>
        <Link
          to="/all-images"
          className={`navLink ${location.pathname === '/all-images' ? 'active' : ''}`}
        >
          Todas
        </Link>
        <Link
          to="/favorites"
          className={`navLink ${location.pathname === '/favorites' ? 'active' : ''}`}
        >
          Favoritos
        </Link>
        <Link
          to="/users"
          className={`navLink ${location.pathname === '/users' ? 'active' : ''}`}
        >
          Usuarios
        </Link>
        <Link
          to="/flagged"
          className={`navLink ${location.pathname === '/flagged' ? 'active' : ''}`}
        >
          Marcadas
        </Link>
        <Link
          to="/settings"
          className={`navLink ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          Configuración
        </Link>
      </div>
    </nav>
  );
}
