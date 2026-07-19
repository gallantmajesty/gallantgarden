import { useState, useMemo, useRef } from 'react'
import { STICKERS, STICKER_CATEGORIES } from './stickerCatalog'

interface StickerPickerProps {
  value: string
  text: string
  size: number
  rotation: number
  onSelect: (url: string) => void
  onText: (text: string) => void
  onSize: (size: number) => void
  onRotation: (rotation: number) => void
  onRemove: () => void
}

export function StickerPicker({
  value, text, size, rotation,
  onSelect, onText, onSize, onRotation, onRemove,
}: StickerPickerProps) {
  const [tab, setTab] = useState<string>('All')
  const [search, setSearch] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let list = STICKERS
    if (tab !== 'All') list = list.filter((s) => s.category === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.label.toLowerCase().includes(q))
    }
    return list
  }, [tab, search])

  return (
    <div className="bp-sticker-picker">
      {value && (
        <div className="bp-sticker-active">
          <div className="bp-sticker-active-row">
            <img src={value} alt="" draggable={false} className="bp-sticker-active-img" />
            <div className="bp-sticker-active-fields">
              <input className="bp-text" maxLength={80} placeholder="Caption (15 words max)..."
                value={text} onChange={(e) => onText(e.target.value)} />
              <div className="bp-sticker-row">
                <span className="bp-field-label">Size</span>
                <input type="range" min={24} max={160} step={2} value={size}
                  onChange={(e) => onSize(Number(e.target.value))} />
              </div>
              <div className="bp-sticker-row">
                <span className="bp-field-label">Rotate</span>
                <input type="range" min={-45} max={45} step={1} value={rotation}
                  onChange={(e) => onRotation(Number(e.target.value))} />
              </div>
              <button className="sf-btn secondary tiny" onClick={onRemove}>Remove</button>
            </div>
          </div>
        </div>
      )}

      <div className="bp-sticker-tabs">
        {STICKER_CATEGORIES.map((c) => (
          <button key={c} className={`bp-sticker-tab ${tab === c ? 'on' : ''}`}
            onClick={() => setTab(c)} type="button">{c}</button>
        ))}
      </div>

      <input className="bp-text bp-sticker-search" placeholder="Search stickers..."
        value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="bp-sticker-grid" ref={gridRef}>
        {filtered.map((s) => (
          <button
            key={s.file}
            type="button"
            className={`bp-sticker-item ${value === `/stickers/${s.file}` ? 'on' : ''}`}
            title={s.label}
            onClick={() => onSelect(`/stickers/${s.file}`)}
          >
            <img src={`/stickers/${s.file}`} alt={s.label} draggable={false} loading="lazy" />
          </button>
        ))}
        {filtered.length === 0 && <p className="bp-sticker-empty">No stickers found</p>}
      </div>
    </div>
  )
}
