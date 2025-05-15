// src/services/ImageService.ts
import axios from 'axios';

export interface Image {
  id: number;
  name: string;
  url: string;
  createdAt: string;
  userName: string;
  isFavorite: boolean;
  userEmail: string;
}

// Ajusta a tu URL real o usa import.meta.env
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE,
});

// Llama esto tras hacer login
export function setAuthToken(token: string) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export async function fetchImages(): Promise<Image[]> {
  const res = await api.get<Image[]>('/images');
  return res.data;
}

export async function fetchRemainingMs(): Promise<number> {
  const res = await api.get<{ ms: number }>('/remaining-time');
  return res.data.ms;
}

export async function uploadImage(name: string, file: File): Promise<Image> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);

  const res = await api.post<Image>('/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function deleteImage(id: number): Promise<void> {
  await api.delete(`/images/${id}`);
}

export async function fetchAllImages(): Promise<Image[]> { 
  const res = await api.get<Image[]>('/admin/all');
  return res.data;
}

export function fetchFavorites()        { return api.get<Image[]>('/admin/favorites').then(r => r.data); }
export function addFavorite(id: number) { return api.post(`/admin/${id}/favorite`); }
export function delFavorite(id: number) { return api.delete(`/admin/${id}/favorite`); }
export function requeueImage(id:number) { return api.post(`/admin/${id}/requeue`); }
