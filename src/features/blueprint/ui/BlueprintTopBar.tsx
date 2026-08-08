// FocusLily top bar — our own branded chrome over the embedded diagram engine.
// Every action drives the SAME draw.io function via the postMessage protocol, so
// the tools are identical to draw.io; only the look is ours.

import { useNavigate } from 'react-router-dom'
import { useDrawioProtocol } from '../engine/DrawioHost'
import type { DrawioProtocol } from '../engine/drawioProtocol'

interface Props {
  title: string
  onTitleChange: (t: string) => void
  onExport: (fmt: 'png' | 'svg' | 'xml') => void
}

function Btn({ label, title, onClick, icon }: { label?: string; title: string; onClick: () => void; icon?: string }) {
  return (
    <button className="fl-tb-btn" title={title} onClick={onClick} aria-label={title}>
      {icon && <span className="fl-tb-ico">{icon}</span>}
      {label && <span className="fl-tb-lbl">{label}</span>}
    </button>
  )
}

export function BlueprintTopBar({ title, onTitleChange, onExport }: Props) {
  const navigate = useNavigate()
  const proto = useDrawioProtocol()

  const run = (a: string) => (proto as DrawioProtocol | null)?.invokeAction(a).catch(() => {})

  return (
    <header className="fl-topbar">
      <div className="fl-tb-group fl-tb-left">
        <Btn icon="←" title="Back to Lobby" onClick={() => navigate('/lobby')} />
        <input
          className="fl-tb-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          spellCheck={false}
          aria-label="Board title"
        />
      </div>

      <div className="fl-tb-group fl-tb-center">
        <div className="fl-tb-seg">
          <Btn icon="▭" title="Insert shape" onClick={() => run('insertShape')} />
          <Btn icon="🖼" title="Insert image" onClick={() => run('image')} />
          <Btn icon="T" title="Insert text" onClick={() => run('text')} />
          <Btn icon="🔗" title="Connect" onClick={() => run('connect')} />
        </div>
        <div className="fl-tb-sep" />
        <div className="fl-tb-seg">
          <Btn icon="⇉" title="Horizontal layout" onClick={() => run('horizontal')} />
          <Btn icon="⇊" title="Vertical layout" onClick={() => run('vertical')} />
          <Btn icon="❋" title="Radial layout" onClick={() => run('radial')} />
          <Btn icon="🌳" title="Tree layout" onClick={() => run('tree')} />
          <Btn icon="✣" title="Organic layout" onClick={() => run('organic')} />
        </div>
        <div className="fl-tb-sep" />
        <div className="fl-tb-seg">
          <Btn icon="↶" title="Undo" onClick={() => run('undo')} />
          <Btn icon="↷" title="Redo" onClick={() => run('redo')} />
        </div>
        <div className="fl-tb-sep" />
        <div className="fl-tb-seg">
          <Btn icon="＋" title="Zoom in" onClick={() => run('zoomIn')} />
          <Btn icon="−" title="Zoom out" onClick={() => run('zoomOut')} />
          <Btn icon="⤢" title="Fit to screen" onClick={() => run('fit')} />
        </div>
      </div>

      <div className="fl-tb-group fl-tb-right">
        <div className="fl-tb-seg">
          <Btn label="Public Diagrams" title="Browse public diagram libraries" onClick={() => run('library')} />
        </div>
        <div className="fl-tb-sep" />
        <div className="fl-tb-seg">
          <Btn label="PNG" title="Export PNG" onClick={() => onExport('png')} />
          <Btn label="SVG" title="Export SVG" onClick={() => onExport('svg')} />
          <Btn label="XML" title="Export XML" onClick={() => onExport('xml')} />
        </div>
      </div>
    </header>
  )
}
