// src/services/ImageService.ts
import axios from 'axios';

export interface Image {
  id: number;
  name: string;
  url: string;
  createdAt: string;
  userEmail: string;
}

// Ajusta a tu URL real o usa import.meta.env
const API_BASE = 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE,
});

// Llama esto tras hacer login
export function setAuthToken(token: string) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export async function fetchImages(): Promise<Image[]> {
  const res = await api.get<Image[]>('/api/images');
  return res.data;
}

export async function uploadImage(name: string, file: File): Promise<Image> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);

  const res = await api.post<Image>('/api/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function deleteImage(id: number): Promise<void> {
  await api.delete(`/api/images/${id}`);
}
