import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AdminNav.css';

export default function AdminNav() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="logo">Open Canvas - Admin</div>

      {/* Hamburger button - only visible on mobile */}
      <button className="hamburger" onClick={toggleMenu} aria-label="Menu">
        <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
        <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
        <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
      </button>

      {/* Nav links - dropdown on mobile, always visible on desktop */}
      <div className={`navLinks ${isMenuOpen ? 'open' : ''}`}>
        <Link
          to="/"
          className={`navLink ${location.pathname === '/' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          Inicio
        </Link>
        <Link
          to="/all-images"
          className={`navLink ${location.pathname === '/all-images' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          Todas
        </Link>
        <Link
          to="/favorites"
          className={`navLink ${location.pathname === '/favorites' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          Favoritos
        </Link>
        <Link
          to="/users"
          className={`navLink ${location.pathname === '/users' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          Usuarios
        </Link>
        <Link
          to="/flagged"
          className={`navLink ${location.pathname === '/flagged' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          Marcadas
        </Link>
        <Link
          to="/settings"
          className={`navLink ${location.pathname === '/settings' ? 'active' : ''}`}
          onClick={closeMenu}
        >
          Configuración
        </Link>
      </div>
    </nav>
  );
}
