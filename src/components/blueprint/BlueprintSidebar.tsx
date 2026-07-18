import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlueprint } from '../../store/blueprint'
import {
  ChevronDown, Plus, Star, Clock, Trash2, Leaf, PanelLeftClose, PanelLeftOpen,
  Search, History, Download, Lock, FileText, Sun, Moon,
} from 'lucide-react'

const BOARD_COLORS = ['#281C12', '#8B7DFF', '#62D7B5', '#FFD86E', '#FF9CAB', '#A8E7FF', '#C4B5FD']

interface SidebarProps {
  open: boolean
  onToggle: () => void
  onExport: () => void
  onToggleSearch: () => void
  dark: boolean
  onToggleDark: () => void
}

export function BlueprintSidebar({ open, onToggle, onExport, onToggleSearch, dark, onToggleDark }: SidebarProps) {
  const navigate = useNavigate()
  const boards = useBlueprint((s) => s.boards)
  const docId = useBlueprint((s) => s.doc.id)
  const docTitle = useBlueprint((s) => s.doc.title)
  const versions = useBlueprint((s) => s.doc.versions)
  const loadBoard = useBlueprint((s) => s.loadBoard)
  const newBoard = useBlueprint((s) => s.newBoard)

  const [view, setView] = useState<'boards' | 'recent'>('boards')
  const [showHistory, setShowHistory] = useState(false)

  const sortedBoards = view === 'recent'
    ? [...boards].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    : boards

  return (
    <aside className={`bp-sidebar ${open ? 'open' : 'collapsed'}`}>
      {/* Toggle button — always visible, outside scroll area */}
      <button className="bp-sidebar-toggle" onClick={onToggle} title={open ? 'Collapse sidebar' : 'Expand sidebar'}>
        {open ? <PanelLeftClose size={16} strokeWidth={2} /> : <PanelLeftOpen size={16} strokeWidth={2} />}
      </button>

      {open && (
        <div className="bp-sidebar-scroll">
          {/* Branding */}
          <div className="bp-sidebar-brand">
            <span className="bp-sidebar-logo">🌸</span>
            <span className="bp-sidebar-brand-name">FocusLily</span>
          </div>

          {/* Back to lobby */}
          <button className="bp-sidebar-back" onClick={() => navigate('/')}>
            <span className="bp-sidebar-back-arrow">‹</span>
            Back to Lobby
          </button>

          {/* Current board header */}
          <div className="bp-sidebar-boardhead">
            <input
              className="bp-sidebar-board-title"
              value={docTitle}
              onChange={(e) => useBlueprint.getState().setTitle(e.target.value)}
              aria-label="Board title"
            />
            <span className="bp-sidebar-saved">Auto-saved</span>
          </div>

          {/* Navigation */}
          <nav className="bp-sidebar-nav">
            <button className={`bp-sidebar-nav-item ${view === 'boards' ? 'active' : ''}`} onClick={() => setView('boards')}>
              <FileText size={16} strokeWidth={2} className="bp-sidebar-nav-lucide" />
              My Boards
            </button>
            <button className={`bp-sidebar-nav-item ${view === 'recent' ? 'active' : ''}`} onClick={() => setView('recent')}>
              <Clock size={16} strokeWidth={2} className="bp-sidebar-nav-lucide" />
              Recent
            </button>
            <button className="bp-sidebar-nav-item" onClick={onToggleSearch}>
              <Search size={16} strokeWidth={2} className="bp-sidebar-nav-lucide" />
              Search
            </button>
            <button className={`bp-sidebar-nav-item ${showHistory ? 'active' : ''}`} onClick={() => setShowHistory((v) => !v)}>
              <History size={16} strokeWidth={2} className="bp-sidebar-nav-lucide" />
              History
            </button>
            <button className="bp-sidebar-nav-item bp-sidebar-export" onClick={onExport}>
              <Download size={16} strokeWidth={2} className="bp-sidebar-nav-lucide" />
              Export
            </button>
          </nav>

          {/* History (versions) */}
          {showHistory && (
            <div className="bp-sidebar-history">
              <button className="bp-sidebar-history-add" onClick={() => { const l = prompt('Name this version')?.trim(); if (l !== undefined) useBlueprint.getState().saveVersion(l); }}>
                + Save snapshot
              </button>
              {versions.length === 0 && <div className="bp-sidebar-empty">No snapshots yet</div>}
              {versions.map((v) => (
                <div key={v.id} className="bp-sidebar-history-row">
                  <button className="bp-sidebar-history-item" onClick={() => useBlueprint.getState().restoreVersion(v.id)}>{v.label}</button>
                  <button className="bp-sidebar-history-del" onClick={() => useBlueprint.getState().deleteVersion(v.id)} aria-label="Delete">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Current board header */}
          <div className="bp-sidebar-board-head">
            <span className="bp-sidebar-section-label">{view === 'recent' ? 'RECENT' : 'BOARDS'}</span>
            <button className="bp-sidebar-section-add" aria-label="Add board" onClick={() => newBoard()}>
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Board list */}
          <div className="bp-sidebar-board-list">
            {sortedBoards.map((b, i) => (
              <button
                key={b.id}
                className={`bp-sidebar-board-item ${b.id === docId ? 'active' : ''}`}
                onClick={() => loadBoard(b.id)}
              >
                <span className="bp-sidebar-board-dot" style={{ background: BOARD_COLORS[i % BOARD_COLORS.length] }} />
                <span className="bp-sidebar-board-name">{b.title}</span>
              </button>
            ))}
          </div>

          {/* Locked sections */}
          <div className="bp-sidebar-locked">
            <div className="bp-sidebar-locked-label">Coming soon</div>
            <button className="bp-sidebar-nav-item locked" disabled title="Coming soon">
              <Star size={16} strokeWidth={2} className="bp-sidebar-nav-lucide" />
              Favorites
              <Lock size={12} strokeWidth={2} className="bp-sidebar-lock" />
            </button>
            <button className="bp-sidebar-nav-item locked" disabled title="Coming soon">
              <Trash2 size={16} strokeWidth={2} className="bp-sidebar-nav-lucide" />
              Trash
              <Lock size={12} strokeWidth={2} className="bp-sidebar-lock" />
            </button>
          </div>

          {/* Theme toggle */}
          <button className="bp-sidebar-theme" onClick={onToggleDark} title="Toggle dark mode">
            {dark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      )}
    </aside>
  )
}
