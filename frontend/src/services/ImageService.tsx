import axios from 'axios';

const API_URL = 'http://localhost:3000/api/images';

export async function fetchImages() {
  const res = await axios.get(API_URL);
  return res.data;
}

export async function uploadImage(name: string, file: File) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);

  const res = await axios.post(API_URL, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
}

export async function deleteImage(id: number) {
  await axios.delete(`${API_URL}/${id}`);
}
