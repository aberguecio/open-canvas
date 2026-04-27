export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { width: number; height: number; x: number; y: number },
  rotation = 0
): Promise<Blob> {
  // Crea elemento <img> a partir de la URL
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = imageSrc
    img.onload = () => resolve(img)
    img.onerror = error => reject(error)
  })

  const rotRad = (rotation * Math.PI) / 180
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedBounds(
    image.width,
    image.height,
    rotRad
  )

  // Canvas para imagen rotada completa
  const canvas = document.createElement('canvas')
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight
  const ctx = canvas.getContext('2d')!

  // Centro para rotación
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  // pixelCrop ya viene en coordenadas del bounding box rotado (react-easy-crop)
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  )

  // Canvas final para la imagen recortada
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = pixelCrop.width
  outputCanvas.height = pixelCrop.height
  const outputCtx = outputCanvas.getContext('2d')!
  outputCtx.putImageData(data, 0, 0)

  // Convierte a Blob WebP
  return new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob(blob => {
      if (!blob) return reject(new Error('Canvas is empty'))
      resolve(blob)
    }, 'image/webp')
  })
}

// Calcula los límites de la caja que contiene la imagen tras rotar
function getRotatedBounds(
  width: number,
  height: number,
  rotation: number
): { width: number; height: number } {
  const cos = Math.abs(Math.cos(rotation))
  const sin = Math.abs(Math.sin(rotation))
  return {
    width: Math.floor(width * cos + height * sin),
    height: Math.floor(width * sin + height * cos)
  }
}