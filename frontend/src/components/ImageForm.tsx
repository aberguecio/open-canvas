// src/components/ImageForm.tsx
import React, { useState, FormEvent } from 'react';

interface Props {
  onAddImage: (name: string, file: File) => Promise<void>;
}

const ImageForm: React.FC<Props> = ({ onAddImage }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !file) return;
    setLoading(true);
    try {
      await onAddImage(name, file);
      setName('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error('Error al subir la imagen', err);
      alert('Error al subir la imagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
      <input
        type="text"
        placeholder="Nombre de la imagen"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        required
      />
      {preview && (
        <div style={{ margin: '0.5rem 0' }}>
          <img
            src={preview}
            alt="preview"
            style={{ maxHeight: 100, objectFit: 'contain' }}
          />
        </div>
      )}
      <button type="submit" disabled={loading}>
        {loading ? 'Subiendo...' : 'Subir imagen'}
      </button>
    </form>
  );
};

export default ImageForm;
