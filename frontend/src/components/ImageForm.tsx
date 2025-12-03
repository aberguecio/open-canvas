import React, { useState, FormEvent, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../utils/cropImage'
import { Area } from 'react-easy-crop/types'
import axios from 'axios'
import { fetchUserTime } from '../services/ImageService'; // Ajusta la ruta según tu estructura

interface Props {
  onAddImage: (name: string, file: File) => Promise<void>
}

const ASPECT = 800 / 480  // 5:3

export default function ImageForm({ onAddImage }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [loading, setLoading] = useState(false)

  const [remainingMs, setRemainingMs] = useState<number>(0)
  const [timer, setTimer] = useState<string>('')

  function formatMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  async function fetchTime() {
  try {
    const ms = await fetchUserTime();
    setRemainingMs(ms);
  } catch (err) {
    console.error('Error al obtener el tiempo restante:', err);
    setRemainingMs(0);
  }
}
  

  useEffect(() => {
    fetchTime();
  }, [])

  useEffect(() => {
    if (remainingMs <= 0) {
      setTimer('')
      return
    }
    setTimer(formatMs(remainingMs))
    const interval = setInterval(() => {
      setRemainingMs(prev => {
        if (prev <= 1000) {
          clearInterval(interval)
          setTimer('')
          return 0
        }
        setTimer(formatMs(prev - 1000))
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [remainingMs])

  const resetForm = () => {
    setName('')
    setFile(null)
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedArea(null)
  }

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => {
    resetForm()
    setIsModalOpen(false)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.type.startsWith('image/')) {
      setFile(f)
      setImageSrc(URL.createObjectURL(f))
    } else {
      setFile(null)
      setImageSrc(null)
      alert('Solo se permiten imágenes')
    }
  }

  const onCropComplete = useCallback(
    (_: Area, cropped: Area) => setCroppedArea(cropped),
    []
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !imageSrc || !croppedArea) return
    setLoading(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedArea, rotation);
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      const croppedFile = new File([blob], `${originalName}.webp`, { type: 'image/webp' });
      await onAddImage(name, croppedFile);
      closeModal();
      fetchTime()
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        alert('Sólo puedes subir una imagen por día. Inténtalo mañana.');
      }else if (axios.isAxiosError(err) && err.response?.status === 422) {
        alert('La imagen no pasó la moderación.');
        fetchTime()
      } else {
        console.error(err);
        alert('Error al procesar o subir la imagen');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : 'unset'
  }, [isModalOpen])

  return (
    <>
      <div className="upload-button-container">
        {remainingMs > 0 ? (
          <button style={{ width: '100%', background: '#444', color: '#fff' }} disabled>
            Espera {timer} para volver a subir
          </button>
        ) : (
          <button className="upload-button" style={{ width: '100%' }} onClick={openModal}>Subir Imagen</button>
        )}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(53, 53, 53, 0.9)', padding: '1.5rem', borderRadius: '8px',
            maxWidth: '90%', width: 500, boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            <button
              onClick={closeModal}
              style={{ position: 'absolute', top: 10, right: 10 }}
            >
              ✕
            </button>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Nombre de la imagen"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%', marginBottom: '0.5rem' }}
              />

              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                required
                style={{ marginBottom: '1rem' }}
              />

              {imageSrc && (
                <div style={{ position: 'relative', width: '100%', height: 240, background: '#333' }}>
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={ASPECT}
                    rotation={rotation}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
              )}

              {imageSrc && (
                <div style={{ margin: '0.5rem 0' }}>
                  <label style={{ display: 'block' }}>
                    Zoom:
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={e => setZoom(Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setRotation((rotation + 90) % 360)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Rotar 90°
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={closeModal} disabled={loading}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading || !croppedArea || !name}>
                  {loading ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}