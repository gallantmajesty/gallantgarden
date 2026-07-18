import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../store/auth'
import { useMagnet } from '../store/magnet'
import { useBlueprint } from '../store/blueprint'
import { getTheme } from '../lib/magnet/themes'
import { exportBoardPng } from '../lib/blueprint/export'
import { ThemeBackdrop } from '../components/magnet/ThemeBackdrop'
import { Canvas } from '../components/blueprint/Canvas'
import { Toolbar } from '../components/blueprint/Toolbar'
import { Inspector } from '../components/blueprint/Inspector'
import { SearchPanel } from '../components/blueprint/SearchPanel'
import { AIPanel } from '../components/blueprint/AIPanel'
import { BlueprintSidebar } from '../components/blueprint/BlueprintSidebar'
import '../screens/TaskMagnet.css'
import './Blueprint.css'
import './Blueprint.dark.css'
import './N8nOverlay.css'

function hexToRgb(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!m) return '40,28,18'
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`
}

export function Blueprint() {
  const { user } = useAuth()
  const magnetReady = useMagnet((s) => s.ready)
  const hydrateMagnet = useMagnet((s) => s.hydrate)
  const mdata = useMagnet((s) => s.data)

  const hydrate = useBlueprint((s) => s.hydrate)
  const ready = useBlueprint((s) => s.ready)

  const [panel, setPanel] = useState<null | 'search' | 'ai'>(null)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uiDark, setUiDark] = useState(true)

  useEffect(() => {
    if (user?.id) {
      void hydrate(user.id)
      if (!magnetReady) hydrateMagnet(user.id)
    }
  }, [user?.id, hydrate, hydrateMagnet, magnetReady])

  const theme = getTheme(mdata.themeId)
  const accent = mdata.accent ?? '#281C12'

  const rootStyle = useMemo(() => {
    const v = theme.vars
    return {
      ['--mg-bg' as string]: v.bg,
      ['--mg-panel']: v.panel,
      ['--mg-panel-soft']: v.panelSoft,
      ['--mg-border']: v.border,
      ['--mg-text']: v.text,
      ['--mg-text-soft']: v.textSoft,
      ['--mg-accent']: accent,
      ['--mg-accent2']: mdata.accent ?? v.accent2,
      ['--mg-accent-rgb']: hexToRgb(accent),
      ['--mg-shadow']: v.shadow,
    } as React.CSSProperties
  }, [theme, accent, mdata.accent])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      const s = useBlueprint.getState()
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
        if (s.selection.length) { e.preventDefault(); s.deleteNodes(s.selection) }
        else if (s.selectedEdgeId) { e.preventDefault(); s.deleteEdge(s.selectedEdgeId) }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) { s.redo() } else { s.undo() }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault(); s.redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !typing) {
        if (s.selection.length) { e.preventDefault(); s.duplicateNodes(s.selection) }
      } else if (e.key === 'Escape') {
        s.clearSelection(); if (s.focus.typeId) s.setFocus(null); setPanel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selection = useBlueprint((s) => s.selection)
  useEffect(() => {
    if (selection.length > 0) setInspectorOpen(true)
  }, [selection])

  async function onExport() {
    try {
      await exportBoardPng(useBlueprint.getState().doc, hexToRgb(accent))
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Try adding at least one note, or exporting again.')
    }
  }

  if (!ready) {
    return (
      <div className="bp-root" style={rootStyle}>
        <ThemeBackdrop theme={theme} density={mdata.particleDensity} accent={mdata.accent} />
        <div className="bp-loading">Pinning up your board…</div>
      </div>
    )
  }

  return (
    <div className={`bp-root ${uiDark ? 'dark' : ''} ${theme.dark ? 'dark' : 'light'}`} style={rootStyle}>
      <ThemeBackdrop theme={theme} density={mdata.particleDensity} accent={mdata.accent} />

      <BlueprintSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onExport={onExport}
        onToggleSearch={() => setPanel((p) => (p === 'search' ? null : 'search'))}
        dark={uiDark}
        onToggleDark={() => setUiDark((d) => !d)}
      />

      <div className="bp-main">
        <Toolbar />

        <Canvas />

        <button
          className={`bp-inspector-toggle ${inspectorOpen ? 'open' : 'closed'}`}
          onClick={() => setInspectorOpen((o) => !o)}
          title={inspectorOpen ? 'Hide panel' : 'Show panel'}
        >
          {inspectorOpen ? '⟩' : '⟨'}
        </button>
        <aside className={`bp-inspector bp-surface ${inspectorOpen ? '' : 'collapsed'}`}>
          <Inspector />
        </aside>

        {panel === 'search' && <SearchPanel onClose={() => setPanel(null)} />}
        {panel === 'ai' && <AIPanel onClose={() => setPanel(null)} />}
      </div>
    </div>
  )
}
