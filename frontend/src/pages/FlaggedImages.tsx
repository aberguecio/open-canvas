import { useEffect, useState } from 'react';
import { fetchFlaggedImages, unflagImage, deleteImage, Image } from '../services/ImageService';

export default function FlaggedImages() {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = () => {
    fetchFlaggedImages()
      .then(setImages)
      .catch(console.error);
  };

  const handleApprove = async (id: number) => {
    try {
      await unflagImage(id);
      loadImages();
    } catch (err) {
      console.error('Error approving image:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this flagged image permanently?')) return;
    try {
      await deleteImage(id);
      loadImages();
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

  if (images.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Flagged Images</h1>
        <p>No flagged images.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Flagged Images ({images.length})</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {images.map((img) => (
          <div key={img.id} style={{ border: '2px solid red', borderRadius: '8px', padding: '1rem', backgroundColor: 'var(--color-button-bg)' }}>
            <img
              src={img.url}
              alt={img.name}
              style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
            />
            <h3 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>{img.name}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '0.25rem 0' }}>
              By: {img.userName}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0' }}>
              {img.userEmail}
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '0.25rem 0' }}>
              Uploaded: {new Date(img.createdAt).toLocaleDateString()}
            </p>
            <p style={{ color: 'red', fontWeight: 'bold', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Reason: {img.flagged}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => handleApprove(img.id)}
                style={{ flex: 1, backgroundColor: 'green', color: 'white', border: 'none' }}
              >
                Approve
              </button>
              <button
                onClick={() => handleDelete(img.id)}
                style={{ flex: 1, backgroundColor: 'red', color: 'white', border: 'none' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
