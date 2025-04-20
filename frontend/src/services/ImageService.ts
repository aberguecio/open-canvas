// src/services/ImageService.ts
import axios from 'axios';

export interface Image {
  id: number;
  name: string;
  url: string;
}

const API_URL = 'http://localhost:4000/api/images';

export async function fetchImages(): Promise<Image[]> {
  const res = await axios.get<Image[]>(API_URL);
  // opcional: ordenar por id descendente
  return res.data;
}

export async function uploadImage(name: string, file: File): Promise<Image> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);

  const res = await axios.post<Image>(API_URL, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function deleteImage(id: number): Promise<void> {
  await axios.delete(`${API_URL}/${id}`);
}
