import { useState } from 'react'
import {
  Plus, Shapes, Undo2, Redo2,
  Minus, ChevronDown, Smile, FileText,
} from 'lucide-react'
import { useBlueprint } from '../../store/blueprint'
import { defaultNoteStyle, NOTE_TEMPLATES, type Shape } from '../../lib/blueprint/types'

const SHAPE_ADDS: { shape: Shape; label: string; bg: string }[] = [
  { shape: 'sticky', label: 'Sticky', bg: '#FEF3C7' },
  { shape: 'rounded', label: 'Card', bg: '#E0F5F0' },
  { shape: 'circle', label: 'Bubble', bg: '#F3E8FF' },
  { shape: 'hexagon', label: 'Hex', bg: '#FFE8E0' },
]

interface ToolbarProps {
  onSticker?: () => void
}

export function Toolbar({ onSticker }: ToolbarProps) {
  const zoom = useBlueprint((s) => s.viewport.zoom)
  const addNode = useBlueprint((s) => s.addNode)
  const undo = useBlueprint((s) => s.undo)
  const redo = useBlueprint((s) => s.redo)
  const setViewport = useBlueprint((s) => s.setViewport)

  const [menu, setMenu] = useState<null | 'shapes' | 'templates'>(null)
  const toggle = (m: typeof menu) => setMenu((cur) => (cur === m ? null : m))

  function zoomBy(factor: number) {
    const vp = useBlueprint.getState().viewport
    const z = Math.min(2.6, Math.max(0.2, vp.zoom * factor))
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const wx = (cx - vp.x) / vp.zoom
    const wy = (cy - vp.y) / vp.zoom
    setViewport({ zoom: z, x: cx - wx * z, y: cy - wy * z })
  }

  function addShape(shape: Shape, bg: string) {
    const style = defaultNoteStyle()
    style.shape = shape
    style.bgColor = bg
    if (shape !== 'sticky') style.bgKind = 'solid'
    addNode({ style, html: '<p></p>' })
    setMenu(null)
  }

  function addTemplate(templateId: string) {
    const t = NOTE_TEMPLATES.find((t) => t.id === templateId)
    if (!t) return
    const style = defaultNoteStyle()
    Object.assign(style, t.style)
    addNode({ style, html: t.html, w: t.w, h: t.h })
    setMenu(null)
  }

  return (
    <>
      {/* Floating center toolbar — canvas tools */}
      <header className="bp-toolbar bp-surface">
        <button className="sf-btn tiny bp-add-note" onClick={() => addNode()}><Plus size={16} strokeWidth={2.4} /> Note</button>
        <div className="bp-rel">
          <button className="sf-btn secondary tiny" onClick={() => toggle('templates')}><FileText size={16} strokeWidth={2} /> Templates <ChevronDown size={14} strokeWidth={2} /></button>
          {menu === 'templates' && (
            <Menu onClose={() => setMenu(null)}>
              <div className="bp-menu-title">Note templates</div>
              <div className="bp-template-grid">
                {NOTE_TEMPLATES.map((t) => (
                  <button key={t.id} className="bp-menu-item bp-template-item" onClick={() => addTemplate(t.id)}>
                    <span className="bp-template-icon">{t.icon}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </Menu>
          )}
        </div>
        {onSticker && (
          <button className="sf-btn tiny bp-sticker-btn" onClick={onSticker} title="Stickers">
            <Smile size={16} strokeWidth={2.4} /> Sticker
          </button>
        )}
        <div className="bp-rel">
          <button className="sf-btn secondary tiny" onClick={() => toggle('shapes')}><Shapes size={16} strokeWidth={2} /> Shape <ChevronDown size={14} strokeWidth={2} /></button>
          {menu === 'shapes' && (
            <Menu onClose={() => setMenu(null)}>
              <div className="bp-menu-title">Add a shape</div>
              <div className="bp-shapemenu-grid">
                {SHAPE_ADDS.map((s) => (
                  <button key={s.shape} className="bp-menu-item bp-shapemenu-item" onClick={() => addShape(s.shape, s.bg)}>{s.label}</button>
                ))}
              </div>
            </Menu>
          )}
        </div>

        <div className="bp-toolbar-divider" />

        <button className="bp-iconbtn" title="Undo" onClick={undo} aria-label="Undo"><Undo2 size={17} strokeWidth={2} /></button>
        <button className="bp-iconbtn" title="Redo" onClick={redo} aria-label="Redo"><Redo2 size={17} strokeWidth={2} /></button>

        <div className="bp-toolbar-divider" />

        <div className="bp-zoom">
          <button className="bp-iconbtn" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out"><Minus size={16} strokeWidth={2} /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button className="bp-iconbtn" onClick={() => zoomBy(1.2)} aria-label="Zoom in"><Plus size={16} strokeWidth={2} /></button>
        </div>
      </header>
    </>
  )
}

function Menu({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="bp-menu-scrim" onClick={onClose} />
      <div className="bp-menu bp-surface">{children}</div>
    </>
  )
}
