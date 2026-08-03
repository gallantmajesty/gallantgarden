import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './AvatarCropper.css'

const VIEW = 320
const OUT = 512
const MIN_ZOOM = 1
const MAX_ZOOM = 4

export function AvatarCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File
  onCancel: () => void
  onDone: (url: string) => void
}) {
  const { t } = useTranslation()
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [src, setSrc] = useState('')
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const baseScale = nat ? Math.max(VIEW / nat.w, VIEW / nat.h) : 1
  const displayScale = baseScale * zoom

  const clamp = useCallback(
    (o: { x: number; y: number }) => {
      if (!nat) return { x: 0, y: 0 }
      const maxX = Math.max(0, (nat.w * displayScale - VIEW) / 2)
      const maxY = Math.max(0, (nat.h * displayScale - VIEW) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      }
    },
    [nat, displayScale],
  )

  useEffect(() => {
    setOffset((o) => clamp(o))
  }, [clamp])

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const next = {
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    }
    setOffset(clamp(next))
  }
  function onPointerUp() {
    drag.current = null
  }
  function onWheel(e: React.WheelEvent) {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)))
    setZoom(z)
  }

  async function confirm() {
    const img = imgRef.current
    if (!img || !nat) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = OUT
      canvas.height = OUT
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const k = OUT / VIEW
      ctx.fillStyle = '#1c140c'
      ctx.fillRect(0, 0, OUT, OUT)
      const dw = nat.w * displayScale
      const dh = nat.h * displayScale
      const left = VIEW / 2 + offset.x - dw / 2
      const top = VIEW / 2 + offset.y - dh / 2
      ctx.drawImage(img, left * k, top * k, dw * k, dh * k)

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      if (!blob) return
      const out = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      const path = `avatars/${crypto.randomUUID()}.jpg`
      const { data, error } = await supabase.storage.from('avatars').upload(path, out)
      if (!error) {
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        onDone(pub.publicUrl)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cropper-scrim" onPointerDown={onCancel}>
      <div className="cropper-card" onPointerDown={(e) => e.stopPropagation()}>
        <h3 className="cropper-title">{t('avatarCropper.title')}</h3>

        <div
          className="cropper-view"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              className="cropper-img"
              onLoad={(e) => {
                const el = e.currentTarget
                setNat({ w: el.naturalWidth, h: el.naturalHeight })
              }}
              style={{
                width: nat ? nat.w * displayScale : 'auto',
                height: nat ? nat.h * displayScale : 'auto',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
          <span className="cropper-ring" />
        </div>

        <label className="cropper-zoom">
          <span>{t('avatarCropper.zoom')}</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        <p className="cropper-hint">{t('avatarCropper.hint')}</p>

        <div className="cropper-actions">
          <button className="sf-btn secondary" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className="sf-btn" onClick={confirm} disabled={busy || !nat}>
            {busy ? t('avatarCropper.saving') : t('avatarCropper.usePhoto')}
          </button>
        </div>
      </div>
    </div>
  )
}