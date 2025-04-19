import React, { useState } from 'react';

interface Props {
  onAddImage: (name: string, file: File) => void;
}

const ImageForm: React.FC<Props> = ({ onAddImage }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file && name) {
      onAddImage(name, file);
      setName('');
      setFile(null);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nombre de la imagen"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit">Subir imagen</button>
    </form>
  );
};

export default ImageForm;
