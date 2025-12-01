import React, { useState, useEffect } from 'react';
import {
  Image,
  fetchRemainingMs,
  fetchBmpUrl, 
} from '../services/ImageService';

interface Props {
  images: Image[];
  onDeleteImage: (id: number) => Promise<void>;
  onAddFav?: (id: number) => Promise<void>;
  onRemoveFav?: (id: number) => Promise<void>;
  onRequeue?: (id: number) => Promise<void>;
  onFlag?: (id: number) => Promise<void>;
  showcurrent?: boolean;
  showAdminActions?: boolean;
  hideAddFav?: boolean;
  currentUser?: string | null;
  adminEmail?: string;
}

const ImageList: React.FC<Props> = ({
  images,
  onDeleteImage,
  onAddFav,
  onRemoveFav,
  onRequeue,
  onFlag,
  showcurrent = false,
  showAdminActions = false,
  hideAddFav = false,
  currentUser,
  adminEmail,
}) => {

  const [timer, setTimer] = useState<string>('00:00:00');
  const [bmpUrl, setBmpUrl] = useState<string | null>(null); 

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    async function initTimer() {
      try {
        const ms = await fetchRemainingMs();
        let remaining = ms;

        setTimer(formatMs(remaining));

        intervalId = setInterval(() => {
          remaining -= 1000;
          if (remaining <= 0) {
            clearInterval(intervalId);
            window.location.reload();
          } else {
            setTimer(formatMs(remaining));
          }
        }, 1000);
      } catch (err) {
        console.error('Error fetching remaining time', err);
      }
    }

    initTimer();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  function formatMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  async function handleShowBmp(id: number) {
    try {
      const url = await fetchBmpUrl(id); 
      setBmpUrl(url);
    } catch (err) {
      console.error('No se pudo obtener el BMP', err);
    }
  }

  function closeOverlay() {
    setBmpUrl(null);
  }
  if (images.length === 0) return <p>No hay imágenes para mostrar.</p>;

  return (
    <>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {images.map((img, index) => {
          const isOwner = currentUser === img.userEmail;
          const isAdmin = currentUser === adminEmail;
          const canDelete = isOwner || isAdmin;

          return (
            <li
              key={img.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '2rem',
                textAlign: 'center',
              }}
            >
              <img
                src={img.url}
                alt={img.name}
                onClick={() => handleShowBmp(img.id)}
                style={{
                  cursor: 'pointer',
                  maxHeight: 500,
                  maxWidth: '95%',
                  marginBottom: '0.5rem',
                  border: index === 0 && showcurrent ? '5px solid limegreen' : 'none',
                  objectFit: 'cover',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                  {img.name}
                  {index === 0 && showcurrent && (
                    <>
                      <span style={{ color: 'limegreen', fontSize: '1rem', marginLeft: '0.5rem' }}>(Current)</span>
                      <div style={{ fontSize: '3rem', marginTop: '0.25rem' }}>{timer}</div>
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: '#777',
                }}
              >
                <span style={{ padding: '10px' }}>
                  Subido por: {img.userName} el {new Date(img.createdAt).toLocaleDateString()}
                </span>

                {canDelete && <button onClick={() => onDeleteImage(img.id)}>Eliminar</button>}

                {showAdminActions && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!img.isFavorite && !hideAddFav && (
                      <button onClick={() => onAddFav?.(img.id)}>★ Fav</button>
                    )}
                    {img.isFavorite && <button onClick={() => onRemoveFav?.(img.id)}>✕ Unfav</button>}
                    <button onClick={() => onRequeue?.(img.id)}>⏩ Requeue</button>
                    {onFlag && <button onClick={() => onFlag(img.id)}>🚩 Flag</button>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {bmpUrl && (
        <div
          onClick={closeOverlay}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'zoom-out',
            zIndex: 1000,
          }}
        >
          <img
            src={bmpUrl}
            alt="BMP preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', boxShadow: '0 0 20px #000' }}
          />
        </div>
      )}
    </>
  );
};

export default ImageList;
