import { supabase } from './supabase'

// Uploads chat images to the `chat-media` storage bucket (see migrations).
// Images are downscaled + re-encoded in-browser before upload to keep the
// 5 MB bucket limit comfortable and the chat snappy. Returns a public URL.

const MAX_DIM = 1600
const TARGET_BYTES = 1_200_000

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

async function fileToCompressedBlob(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file)
  let { naturalWidth: sw, naturalHeight: sh } = img
  const scale = Math.min(1, MAX_DIM / Math.max(sw, sh))
  const width = Math.max(1, Math.round(sw * scale))
  const height = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Fall back to the original file if canvas is unavailable.
    return { blob: file, width, height }
  }
  ctx.drawImage(img, 0, 0, width, height)

  const type = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  let quality = 0.85
  let blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality))
  while (blob && blob.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.1
    blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality))
  }
  return { blob: blob ?? file, width, height }
}

export async function uploadChatImage(file: File): Promise<UploadedImage | null> {
  if (!file.type.startsWith('image/')) return null
  const { blob, width, height } = await fileToCompressedBlob(file)
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
