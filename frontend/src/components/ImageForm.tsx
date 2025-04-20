// src/components/ImageForm.tsx
import React, { useState, FormEvent, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../utils/cropImage'
import { Area } from 'react-easy-crop/types'

interface Props {
  onAddImage: (name: string, file: File) => Promise<void>
}

const ASPECT = 800 / 480  // 5:3

export default function ImageForm({ onAddImage }: Props) {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  // Crop state
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [loading, setLoading] = useState(false)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.type.startsWith('image/')) {
      setFile(f)
      setImageSrc(URL.createObjectURL(f))
    } else {
      setFile(null)
      setImageSrc(null)
      alert('Solo imágenes válidas')
    }
  }

  const onCropComplete = useCallback(
    (_: Area, cropped: Area) => {
      setCroppedArea(cropped)
    },
    []
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !imageSrc || !croppedArea) return
    setLoading(true)
    try {
      // Obtenemos blob recortado
      const blob = await getCroppedImg(imageSrc, croppedArea)
      // Lo convertimos en File para que mantenga nombre y tipo
      const croppedFile = new File([blob], file.name, { type: 'image/png' })
      await onAddImage(name, croppedFile)
      // Reset
      setName('')
      setFile(null)
      setImageSrc(null)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    } catch (err) {
      console.error(err)
      alert('Error al procesar la imagen')
    } finally {
      setLoading(false)
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
        onChange={onFileChange}
        required
      />

      {imageSrc && (
        <div style={{ position: 'relative', width: 400, height: 240 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}

      {imageSrc && (
        <div style={{ margin: '0.5rem 0' }}>
          <label>
            Zoom:
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      <button type="submit" disabled={loading || !croppedArea}>
        {loading ? 'Procesando...' : 'Subir imagen'}
      </button>
    </form>
  )
}
