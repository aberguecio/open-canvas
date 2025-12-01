import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAuthToken } from '../services/ImageService';

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  isAdmin: boolean;
  login: (token: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('userEmail');
    const tokenExpiresAt = localStorage.getItem('tokenExpiresAt');

    if (storedToken && storedEmail && tokenExpiresAt) {
      const expiresAt = Number(tokenExpiresAt);
      if (Date.now() < expiresAt) {
        setToken(storedToken);
        setUserEmail(storedEmail);
        setAuthToken(storedToken);
      } else {
        // Token expired - clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('tokenExpiresAt');
      }
    }
  }, []);

  const login = (newToken: string, email: string) => {
    setToken(newToken);
    setUserEmail(email);
    setAuthToken(newToken);

    const expiresInMs = 12 * 60 * 60 * 1000; // 12 hours
    const expiresAt = Date.now() + expiresInMs;
    localStorage.setItem('token', newToken);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('tokenExpiresAt', expiresAt.toString());
  };

  const logout = () => {
    setToken(null);
    setUserEmail(null);
    setAuthToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('tokenExpiresAt');
  };

  const isAdmin = userEmail === adminEmail;

  return (
    <AuthContext.Provider value={{ token, userEmail, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
