import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlueprint } from '../../store/blueprint'
import { defaultNoteStyle, type Shape } from '../../lib/blueprint/types'

const SHAPE_ADDS: { shape: Shape; label: string; bg: string }[] = [
  { shape: 'sticky', label: 'Sticky', bg: '#262019' },
  { shape: 'rounded', label: 'Card', bg: 'var(--mg-panel,#ffffff)' },
  { shape: 'circle', label: '◯ Bubble', bg: 'rgba(var(--mg-accent-rgb,91,124,250),0.1)' },
  { shape: 'hexagon', label: '⬢ Hex', bg: 'rgba(var(--mg-accent-rgb,91,124,250),0.12)' },
]

interface ToolbarProps {
  onToggleSearch: () => void
  onToggleAI: () => void
  onExport: () => void
}

export function Toolbar({ onToggleSearch, onToggleAI, onExport }: ToolbarProps) {
  const navigate = useNavigate()
  const title = useBlueprint((s) => s.doc.title)
  const snap = useBlueprint((s) => s.doc.snap)
  const zoom = useBlueprint((s) => s.doc.viewport.zoom)
  const boards = useBlueprint((s) => s.boards)
  const docId = useBlueprint((s) => s.doc.id)
  const versions = useBlueprint((s) => s.doc.versions)
  const setTitle = useBlueprint((s) => s.setTitle)
  const addNode = useBlueprint((s) => s.addNode)
  const undo = useBlueprint((s) => s.undo)
  const redo = useBlueprint((s) => s.redo)
  const autoArrange = useBlueprint((s) => s.autoArrange)
  const toggleSnap = useBlueprint((s) => s.toggleSnap)
  const setViewport = useBlueprint((s) => s.setViewport)

  const [menu, setMenu] = useState<null | 'boards' | 'shapes' | 'templates' | 'versions'>(null)
  const toggle = (m: typeof menu) => setMenu((cur) => (cur === m ? null : m))

  function zoomBy(factor: number) {
    const vp = useBlueprint.getState().doc.viewport
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
    <header className="bp-toolbar bp-surface">
      <button className="sf-btn secondary tiny" onClick={() => navigate('/')}>← Lobby</button>

      <div className="bp-toolbar-board">
        <input className="bp-title-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="bp-caret" onClick={() => toggle('boards')}>▾</button>
        {menu === 'boards' && (
          <Menu onClose={() => setMenu(null)}>
            <div className="bp-menu-title">Your boards</div>
            {boards.map((b) => (
              <button key={b.id} className={`bp-menu-item ${b.id === docId ? 'on' : ''}`} onClick={() => { useBlueprint.getState().loadBoard(b.id); setMenu(null) }}>{b.title}</button>
            ))}
            <div className="bp-menu-sep" />
            <button className="bp-menu-item" onClick={() => { useBlueprint.getState().newBoard(); setMenu(null) }}>+ New board</button>
            {boards.length > 1 && (
              <button className="bp-menu-item danger" onClick={() => { if (confirm('Delete this board?')) { useBlueprint.getState().deleteBoard(docId); setMenu(null) } }}>Delete current</button>
            )}
          </Menu>
        )}
      </div>

      <div className="bp-toolbar-divider" />

      <button className="sf-btn tiny" onClick={() => addNode()}>+ Note</button>
      <div className="bp-rel">
        <button className="sf-btn secondary tiny" onClick={() => toggle('shapes')}>+ Shape ▾</button>
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

      <button className="bp-iconbtn" title="Undo" onClick={undo}>↶</button>
      <button className="bp-iconbtn" title="Redo" onClick={redo}>↷</button>
      <button className="bp-iconbtn" title="Auto-arrange" onClick={autoArrange}>⊞</button>
      <button className={`bp-iconbtn ${snap ? 'on' : ''}`} title="Snap to grid" onClick={toggleSnap}>⋈</button>

      <div className="bp-zoom">
        <button className="bp-iconbtn" onClick={() => zoomBy(1 / 1.2)}>−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button className="bp-iconbtn" onClick={() => zoomBy(1.2)}>+</button>
      </div>

      <div className="bp-toolbar-spacer" />

      <button className="sf-btn secondary tiny" onClick={onToggleSearch}>Search</button>
      <button className="sf-btn secondary tiny" onClick={onToggleAI}>✦ AI</button>
      <div className="bp-rel">
        <button className="sf-btn secondary tiny" onClick={() => toggle('templates')}>Templates ▾</button>
        {menu === 'templates' && <TemplatesMenu onClose={() => setMenu(null)} />}
      </div>
      <div className="bp-rel">
        <button className="sf-btn secondary tiny" onClick={() => toggle('versions')}>History ▾</button>
        {menu === 'versions' && (
          <Menu onClose={() => setMenu(null)}>
            <button className="bp-menu-item" onClick={() => { const l = prompt('Name this version')?.trim(); useBlueprint.getState().saveVersion(l || ''); }}>+ Save snapshot</button>
            <div className="bp-menu-sep" />
            {versions.length === 0 && <div className="bp-menu-empty">No snapshots yet</div>}
            {versions.map((v) => (
              <div key={v.id} className="bp-menu-row">
                <button className="bp-menu-item grow" onClick={() => { useBlueprint.getState().restoreVersion(v.id); setMenu(null) }}>{v.label}</button>
                <button className="bp-x" onClick={() => useBlueprint.getState().deleteVersion(v.id)}>✕</button>
              </div>
            ))}
          </Menu>
        )}
      </div>

      <button className="sf-btn tiny" onClick={onExport}>⤓ PNG</button>
    </header>
  )
}

function TemplatesMenu({ onClose }: { onClose: () => void }) {
  const [, force] = useState(0)
  const templates = useBlueprint.getState().templates()
  return (
    <Menu onClose={onClose}>
      <button className="bp-menu-item" onClick={() => { const t = prompt('Template name')?.trim(); useBlueprint.getState().saveTemplate(t || ''); force((n) => n + 1) }}>+ Save current as template</button>
      <div className="bp-menu-sep" />
      {templates.length === 0 && <div className="bp-menu-empty">No templates yet</div>}
      {templates.map((t) => (
        <div key={t.id} className="bp-menu-row">
          <button className="bp-menu-item grow" onClick={() => { useBlueprint.getState().applyTemplate(t.id); onClose() }}>{t.title}</button>
          <button className="bp-x" onClick={() => { useBlueprint.getState().deleteTemplate(t.id); force((n) => n + 1) }}>✕</button>
        </div>
      ))}
    </Menu>
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
