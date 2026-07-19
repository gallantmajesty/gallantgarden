import { useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { STICKERS, STICKER_CATEGORIES } from './stickerCatalog'
import { defaultNoteStyle } from '../../lib/blueprint/types'

export function StickerPanel({ onClose }: { onClose: () => void }) {
  const selection = useBlueprint((s) => s.selection)
  const doc = useBlueprint((s) => s.doc)
  const addNode = useBlueprint((s) => s.addNode)
  const updateNodeStyle = useBlueprint((s) => s.updateNodeStyle)

  const nodeId = selection.length === 1 ? selection[0] : null
  const node = nodeId ? doc.nodes.find((n) => n.id === nodeId) : null
  const isStickerNode = node?.kind === 'sticker'

  const [tab, setTab] = useState<string>('All')
  const [search, setSearch] = useState('')

  const filtered = (() => {
    let list = STICKERS
    if (tab !== 'All') list = list.filter((s) => s.category === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.label.toLowerCase().includes(q))
    }
    return list
  })()

  function placeSticker(url: string) {
    if (isStickerNode) {
      updateNodeStyle(nodeId!, { stickerUrl: url })
    } else {
      const style = defaultNoteStyle()
      style.stickerUrl = url
      style.stickerSize = 100
      style.stickerRotation = 0
      style.stickerText = ''
      addNode({ kind: 'sticker', w: 100, h: 100, html: '', style })
    }
  }

  return (
    <div className="bp-panel bp-surface" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>Stickers</strong>
        <button className="sf-btn secondary tiny" onClick={onClose}>×</button>
      </div>

      {isStickerNode && (
        <div className="bp-sticker-active-panel">
          <div className="bp-sticker-active-row">
            <img src={node.style.stickerUrl} alt="" draggable={false} className="bp-sticker-active-img" />
            <div className="bp-sticker-active-fields">
              <input className="bp-text" maxLength={80} placeholder="Caption..."
                value={node.style.stickerText ?? ''}
                onChange={(e) => updateNodeStyle(nodeId!, { stickerText: e.target.value })} />
              <div className="bp-sticker-row">
                <span className="bp-field-label">Size</span>
                <input type="range" min={40} max={300} step={2} value={node.w}
                  onChange={(e) => { const v = Number(e.target.value); useBlueprint.getState().setNodeRect(nodeId!, { w: v, h: v }) }} />
              </div>
              <div className="bp-sticker-row">
                <span className="bp-field-label">Rotate</span>
                <input type="range" min={-180} max={180} step={1} value={node.style.stickerRotation ?? 0}
                  onChange={(e) => updateNodeStyle(nodeId!, { stickerRotation: Number(e.target.value) })} />
              </div>
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

      <div className="bp-sticker-grid">
        {filtered.map((s) => (
          <button
            key={s.file}
            type="button"
            className={`bp-sticker-item ${isStickerNode && node.style.stickerUrl === `/stickers/${s.file}` ? 'on' : ''}`}
            title={s.label}
            onClick={() => placeSticker(`/stickers/${s.file}`)}
          >
            <img src={`/stickers/${s.file}`} alt={s.label} draggable={false} loading="lazy" />
          </button>
        ))}
        {filtered.length === 0 && <p className="bp-sticker-empty">No stickers found</p>}
      </div>
    </div>
  )
}
