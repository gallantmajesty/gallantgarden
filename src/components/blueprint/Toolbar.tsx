import { useState } from 'react'
import {
  Plus, Shapes, Undo2, Redo2,
  Minus, ChevronDown, Sparkles,
} from 'lucide-react'
import { useBlueprint } from '../../store/blueprint'
import { defaultNoteStyle, type Shape } from '../../lib/blueprint/types'

const SHAPE_ADDS: { shape: Shape; label: string; bg: string }[] = [
  { shape: 'sticky', label: 'Sticky', bg: '#23272F' },
  { shape: 'rounded', label: 'Card', bg: '#23272F' },
  { shape: 'circle', label: 'Bubble', bg: '#2C313A' },
  { shape: 'hexagon', label: 'Hex', bg: '#2C313A' },
]

interface ToolbarProps {
  onJarvis?: () => void
}

export function Toolbar({ onJarvis }: ToolbarProps) {
  const zoom = useBlueprint((s) => s.viewport.zoom)
  const addNode = useBlueprint((s) => s.addNode)
  const undo = useBlueprint((s) => s.undo)
  const redo = useBlueprint((s) => s.redo)
  const setViewport = useBlueprint((s) => s.setViewport)

  const [menu, setMenu] = useState<null | 'shapes'>(null)
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

  return (
    <>
      {/* Floating center toolbar — canvas tools */}
      <header className="bp-toolbar bp-surface">
        <button className="sf-btn tiny bp-add-note" onClick={() => addNode()}><Plus size={16} strokeWidth={2.4} /> Note</button>
        {onJarvis && (
          <button className="sf-btn tiny bp-jarvis-btn" onClick={onJarvis} title="Jarvis · AI Assistant">
            <Sparkles size={16} strokeWidth={2.4} /> Jarvis
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
