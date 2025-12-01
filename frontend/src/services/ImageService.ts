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
  flagged?: string | null;
  isVisible?: boolean;
}

export interface User {
  email: string;
  name: string;
  uploadCount: number;
  flaggedCount: number;
  lastUpload: string;
  isBanned: boolean;
}

export interface UserDetails {
  email: string;
  name: string;
  uploadCount: number;
  images: Image[];
}

export interface Settings {
  id: number;
  uploadLimitPerDay: number;
  rotationIntervalHours: number;
  defaultImageDurationHours: number;
  updatedAt: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE,
});

export function setAuthToken(token: string) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export async function fetchImages(): Promise<Image[]> {
  const res = await api.get<Image[]>('/api/images');
  return res.data;
}

export async function fetchRemainingMs(): Promise<number> {
  const res = await api.get<{ ms: number }>('/api/remaining-time');
  return res.data.ms;
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

export async function fetchAllImages(): Promise<Image[]> {
  const res = await api.get<Image[]>('/api/admin/all');
  return res.data;
}

export function fetchFavorites() { return api.get<Image[]>('/api/admin/favorites').then(r => r.data); }
export function addFavorite(id: number) { return api.post(`/api/admin/${id}/favorite`); }
export function delFavorite(id: number) { return api.delete(`/api/admin/${id}/favorite`); }
export function requeueImage(id: number) { return api.post(`/api/admin/${id}/requeue`); }


export async function fetchUserTime(): Promise<number> {
  const res = await api.get<{ remainingMs: number }>('/api/images/time');
  return res.data.remainingMs;
}

export async function fetchBmpUrl(id: number): Promise<string> {
  const { data } = await api.get<{ url: string }>(`/api/images/${id}/bmp`);
  return data.url;
}

// ========== USER MANAGEMENT ==========

export async function fetchUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/api/admin/users');
  return res.data;
}

export async function fetchUserDetails(email: string): Promise<UserDetails> {
  const res = await api.get<UserDetails>(`/api/admin/users/${encodeURIComponent(email)}`);
  return res.data;
}

export async function banUser(email: string, reason?: string): Promise<void> {
  await api.post(`/api/admin/users/${encodeURIComponent(email)}/ban`, { reason });
}

export async function unbanUser(email: string): Promise<void> {
  await api.delete(`/api/admin/users/${encodeURIComponent(email)}/ban`);
}

// ========== CONTENT MODERATION ==========

export async function fetchFlaggedImages(): Promise<Image[]> {
  const res = await api.get<Image[]>('/api/admin/flagged');
  return res.data;
}

export async function flagImage(id: number, reason?: string): Promise<void> {
  await api.post(`/api/admin/${id}/flag`, { reason });
}

export async function unflagImage(id: number): Promise<void> {
  await api.delete(`/api/admin/${id}/flag`);
}

// ========== SETTINGS ==========

export async function fetchSettings(): Promise<Settings> {
  const res = await api.get<Settings>('/api/admin/settings');
  return res.data;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const res = await api.put<Settings>('/api/admin/settings', settings);
  return res.data;
}