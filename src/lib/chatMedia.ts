import { supabase } from './supabase'

// Uploads chat images to the `chat-media` storage bucket (see migrations).
// Images are downscaled + re-encoded in-browser before upload to keep the
// 5 MB bucket limit comfortable and the chat snappy. Returns a public URL.

const MAX_DIM = 1600
const TARGET_BYTES = 1_400_000 // aim comfortably under the 2 MB hard cap
const HARD_CAP = 2_000_000 // images must never exceed 2 MB
const MIN_QUALITY = 0.4

export interface UploadedImage {
  url: string
  width: number
  height: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

async function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  // Try JPEG/WebP at descending quality; PNG only at the source type (lossless
  // re-encoding rarely shrinks). First encoding under target wins.
  const attempts: Array<[string, number]> = type === 'image/png'
    ? [['image/png', 0.9], ['image/webp', 0.85], ['image/jpeg', 0.85]]
    : [[type, 0.85], ['image/webp', 0.85]]
  for (const [enc, q] of attempts) {
    for (let quality = q; quality >= MIN_QUALITY; quality -= 0.1) {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, enc, quality))
      if (blob && blob.size <= TARGET_BYTES) return blob
    }
  }
  return null
}

async function fileToCompressedBlob(file: File): Promise<{ blob: Blob; width: number; height: number } | null> {
  const img = await loadImage(file)
  const srcType = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  const source = img.naturalWidth > 0 ? img : null
  if (!source) return null

  // Shrink the canvas in rounds until the encode lands under the 2 MB cap.
  let maxDim = MAX_DIM
  for (let round = 0; round < 6; round++) {
    const scale = Math.min(1, maxDim / Math.max(source.naturalWidth, source.naturalHeight))
    const width = Math.max(1, Math.round(source.naturalWidth * scale))
    const height = Math.max(1, Math.round(source.naturalHeight * scale))
    if (width < 24 || height < 24) break // never go below a usable thumbnail

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, width, height)

    const blob = await encode(canvas, srcType)
    if (blob && blob.size <= HARD_CAP) return { blob, width, height }
    maxDim = Math.round(maxDim * 0.75)
  }
  return null
}

export async function uploadChatImage(file: File): Promise<UploadedImage | null> {
  if (!file.type.startsWith('image/')) return null
  const compressed = await fileToCompressedBlob(file)
  if (!compressed) return null // couldn't get under the 2 MB cap
  const { blob, width, height } = compressed
  if (blob.size > HARD_CAP) return null
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `chat/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('chat-media').upload(path, blob, {
    cacheControl: '31536000',
    contentType: blob.type,
    upsert: false,
  })
  if (error) return null
  const { data } = supabase.storage.from('chat-media').getPublicUrl(path)
  return { url: data.publicUrl, width, height }
}
