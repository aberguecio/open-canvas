export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { width: number; height: number; x: number; y: number }
  ): Promise<Blob> {
    const image = await new Promise<HTMLImageElement>(resolve => {
      const img = new Image()
      img.src = imageSrc
      img.onload = () => resolve(img)
    })
  
    const canvas = document.createElement('canvas')
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height
    const ctx = canvas.getContext('2d')!
  
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )
  
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Canvas is empty'))
        resolve(blob)
      }, 'image/png')
    })
  }
  