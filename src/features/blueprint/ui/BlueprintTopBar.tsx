import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlueprint } from '../store'
import { useDrawioProtocol } from '../engine/DrawioHost'

interface Props {
  onExport: (fmt: 'png' | 'svg' | 'xml') => void
  onTemplates: () => void
}

interface BtnProps {
  title: string
  label?: string
  children?: React.ReactNode
  onClick: () => void
  active?: boolean
}

function Btn({ title, label, children, onClick, active }: BtnProps) {
  return (
    <button
      className={`fl-tb-btn${active ? ' active' : ''}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
      {label && <span className="fl-tb-lbl">{label}</span>}
    </button>
  )
}

// SVG icon helpers (inline, no external deps)
const I = {
  arrowLeft: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 4 6 8 10 12"/>
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/>
    </svg>
  ),
  shape: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="2" width="6" height="6" rx="1"/><circle cx="11" cy="11" r="3.5"/>
    </svg>
  ),
  text: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="4" x2="13" y2="4"/><line x1="8" y1="4" x2="8" y2="13"/>
    </svg>
  ),
  image: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="3" width="12" height="10" rx="1.5"/>
      <circle cx="5.5" cy="6.5" r="1"/><polyline points="2 13 6 9 9 12 11 10 14 13"/>
    </svg>
  ),
  sticky: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2 3h12v8l-4 4H2V3z"/>
    </svg>
  ),
  link: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 10l4-4M7 6H4a3 3 0 000 6h3M9 10h3a3 3 0 000-6H9"/>
    </svg>
  ),
  layoutH: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="1" y="5" width="4" height="6" rx="1"/>
      <rect x="6" y="5" width="4" height="6" rx="1"/>
      <rect x="11" y="5" width="4" height="6" rx="1"/>
    </svg>
  ),
  layoutV: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="5" y="1" width="6" height="4" rx="1"/>
      <rect x="5" y="6" width="6" height="4" rx="1"/>
      <rect x="5" y="11" width="6" height="4" rx="1"/>
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="5" y="1" width="6" height="4" rx="1"/><line x1="8" y1="5" x2="8" y2="7"/>
      <line x1="4" y1="7" x2="12" y2="7"/><line x1="4" y1="7" x2="4" y2="9"/>
      <line x1="12" y1="7" x2="12" y2="9"/>
      <rect x="1" y="9" width="6" height="4" rx="1"/>
      <rect x="9" y="9" width="6" height="4" rx="1"/>
    </svg>
  ),
  radial: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.5"/><line x1="8" y1="2" x2="8" y2="5.5"/>
      <line x1="8" y1="10.5" x2="8" y2="14"/><line x1="2" y1="8" x2="5.5" y2="8"/>
      <line x1="10.5" y1="8" x2="14" y2="8"/>
    </svg>
  ),
  organic: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="2"/><circle cx="3" cy="4" r="1.5"/>
      <circle cx="13" cy="5" r="1.5"/><circle cx="4" cy="13" r="1.5"/>
      <circle cx="13" cy="12" r="1.5"/>
      <line x1="6.5" y1="6.8" x2="4.1" y2="5.2"/><line x1="9.4" y1="6.8" x2="11.8" y2="5.8"/>
      <line x1="6.8" y1="9.5" x2="5" y2="11.7"/><line x1="9.2" y1="9.5" x2="11.5" y2="11.3"/>
    </svg>
  ),
  undo: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 7H9a4 4 0 010 8H3"/><polyline points="6 3 2 7 6 11"/>
    </svg>
  ),
  redo: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M13 7H7a4 4 0 000 8h6"/><polyline points="10 3 14 7 10 11"/>
    </svg>
  ),
  selectAll: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2">
      <rect x="2" y="2" width="12" height="12" rx="1"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polyline points="3 5 13 5"/><path d="M6 5V3h4v2"/>
      <path d="M5 5l.8 9h4.4l.8-9"/>
    </svg>
  ),
  zoomIn: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
      <line x1="7" y1="5" x2="7" y2="9"/><line x1="5" y1="7" x2="9" y2="7"/>
    </svg>
  ),
  zoomOut: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
      <line x1="5" y1="7" x2="9" y2="7"/>
    </svg>
  ),
  fit: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polyline points="2 6 2 2 6 2"/><polyline points="10 2 14 2 14 6"/>
      <polyline points="14 10 14 14 10 14"/><polyline points="6 14 2 14 2 10"/>
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5"/><line x1="8" y1="5.5" x2="8" y2="8.5"/><circle cx="8" cy="10.5" r="0.8" fill="currentColor"/>
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="5" y1="2" x2="5" y2="14"/><line x1="11" y1="2" x2="11" y2="14"/>
      <line x1="2" y1="5" x2="14" y2="5"/><line x1="2" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  fullscreen: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polyline points="3 7 3 3 7 3"/><polyline points="9 3 13 3 13 7"/>
      <polyline points="13 9 13 13 9 13"/><polyline points="7 13 3 13 3 9"/>
    </svg>
  ),
  template: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="2" width="12" height="4" rx="1"/>
      <rect x="2" y="9" width="5" height="5" rx="1"/>
      <rect x="9" y="9" width="5" height="5" rx="1"/>
    </svg>
  ),
  export: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 2v8M5 7l3 3 3-3"/><path d="M3 12h10v1.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5V12z"/>
    </svg>
  ),
}

export function BlueprintTopBar({ onExport, onTemplates }: Props) {
  const navigate = useNavigate()
  const title = useBlueprint((s) => s.activeBoard()?.title ?? 'Blueprint')
  const renameBoard = useBlueprint((s) => s.renameBoard)
  const activeId = useBlueprint((s) => s.activeId)
  const savedIndicator = useBlueprint((s) => s.savedIndicator)
  const toggleSidebar = useBlueprint((s) => s.toggleSidebar)
  const sidebarOpen = useBlueprint((s) => s.sidebarOpen)

  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Read the live engine handle at click time — the module-level proto is only
  // set after the iframe mounts, so a render-time read could be stale/null.
  const run = (action: string) => useDrawioProtocol()?.invokeAction(action).catch(() => {})

  useEffect(() => {
    if (!exportOpen) return
    const close = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [exportOpen])

  const savedClass = savedIndicator === 'saved' ? '' : savedIndicator === 'unsaved' ? ' unsaved' : ' saving'
  const savedLabel = savedIndicator === 'saved' ? 'Saved' : savedIndicator === 'unsaved' ? 'Unsaved' : 'Saving…'

  return (
    <header className="fl-topbar">
      {/* Left */}
      <div className="fl-tb-group fl-tb-left">
        <Btn title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} onClick={toggleSidebar} active={sidebarOpen}>
          {I.menu}
        </Btn>
        <button
          className="fl-tb-logo"
          onClick={() => navigate('/lobby')}
          title="Back to Lobby"
          aria-label="Back to Lobby"
        >
          <span className="fl-tb-logo-icon">🌲</span>
          Blueprint
        </button>
        <div className="fl-tb-sep" />
        <input
          className="fl-tb-title"
          value={title}
          onChange={(e) => renameBoard(activeId, e.target.value)}
          spellCheck={false}
          aria-label="Board title"
          placeholder="Untitled Board"
        />
      </div>

      {/* Center: tool segments */}
      <div className="fl-tb-group fl-tb-center">
        {/* Insert */}
        <div className="fl-tb-seg">
          <Btn title="Insert shape" onClick={() => run('insertShape')}>{I.shape}</Btn>
          <Btn title="Insert text" onClick={() => run('text')}>{I.text}</Btn>
          <Btn title="Insert image" onClick={() => run('image')}>{I.image}</Btn>
          <Btn title="Sticky note" onClick={() => run('insertStickyNote')}>{I.sticky}</Btn>
          <Btn title="Connect" onClick={() => run('connect')}>{I.link}</Btn>
        </div>
        <div className="fl-tb-sep" />

        {/* Layout */}
        <div className="fl-tb-seg">
          <Btn title="Horizontal layout" onClick={() => run('horizontal')}>{I.layoutH}</Btn>
          <Btn title="Vertical layout" onClick={() => run('vertical')}>{I.layoutV}</Btn>
          <Btn title="Tree layout" onClick={() => run('tree')}>{I.tree}</Btn>
          <Btn title="Radial layout" onClick={() => run('radial')}>{I.radial}</Btn>
          <Btn title="Organic layout" onClick={() => run('organic')}>{I.organic}</Btn>
        </div>
        <div className="fl-tb-sep" />

        {/* Edit */}
        <div className="fl-tb-seg">
          <Btn title="Undo (Ctrl+Z)" onClick={() => run('undo')}>{I.undo}</Btn>
          <Btn title="Redo (Ctrl+Y)" onClick={() => run('redo')}>{I.redo}</Btn>
          <Btn title="Select all" onClick={() => run('selectAll')}>{I.selectAll}</Btn>
          <Btn title="Delete selection" onClick={() => run('delete')}>{I.trash}</Btn>
        </div>
        <div className="fl-tb-sep" />

        {/* View */}
        <div className="fl-tb-seg">
          <Btn title="Zoom in" onClick={() => run('zoomIn')}>{I.zoomIn}</Btn>
          <Btn title="Zoom out" onClick={() => run('zoomOut')}>{I.zoomOut}</Btn>
          <Btn title="Fit to screen" onClick={() => run('fit')}>{I.fit}</Btn>
          <Btn title="Reset zoom (100%)" onClick={() => run('resetView')}>{I.reset}</Btn>
          <Btn title="Toggle grid" onClick={() => run('grid')}>{I.grid}</Btn>
          <Btn title="Fullscreen (Ctrl+Shift+F)" onClick={() => run('toggleFullscreen')}>{I.fullscreen}</Btn>
        </div>
      </div>

      {/* Right */}
      <div className="fl-tb-group fl-tb-right">
        <span className={`fl-saved-dot${savedClass}`}>{savedLabel}</span>
        <div className="fl-tb-sep" />
        <Btn title="Templates" onClick={onTemplates} label="Templates">{I.template}</Btn>
        <div className="fl-tb-sep" />
        <div className="fl-export-wrap" ref={exportRef}>
          <Btn title="Export diagram" onClick={() => setExportOpen((v) => !v)} label="Export">
            {I.export}
          </Btn>
          {exportOpen && (
            <div className="fl-export-menu" role="menu">
              <div className="fl-export-item" role="menuitem" onClick={() => { onExport('png'); setExportOpen(false) }}>
                <span>🖼</span> Export PNG
              </div>
              <div className="fl-export-item" role="menuitem" onClick={() => { onExport('svg'); setExportOpen(false) }}>
                <span>◈</span> Export SVG
              </div>
              <div className="fl-export-item" role="menuitem" onClick={() => { onExport('xml'); setExportOpen(false) }}>
                <span>＜/＞</span> Export XML
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
