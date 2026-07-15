import { useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { uploadMedia } from '../../lib/blueprint/sync'
import { FONT_OPTIONS, YARN_STYLE_META, type Shape, type TextAlign } from '../../lib/blueprint/types'
import { Field, Select, Slider } from './controls'

const SHAPES: { value: Shape; label: string }[] = [
  { value: 'sticky', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'hexagon', label: 'Hex' },
]
const BG_SWATCHES = ['#FFFFFF', '#FFF5B8', '#EAF4FF', '#DDF8F0', '#FFE9F1', '#F1ECFF']

type InspectorTab = 'style' | 'properties' | 'connections'

export function Inspector() {
  const doc = useBlueprint((s) => s.doc)
  const selection = useBlueprint((s) => s.selection)
  const selectedEdgeId = useBlueprint((s) => s.selectedEdgeId)
  const [tab, setTab] = useState<InspectorTab>('style')

  if (selectedEdgeId) return <EdgeInspector edgeId={selectedEdgeId} />
  if (selection.length === 1) return <NodeInspector nodeId={selection[0]} tab={tab} setTab={setTab} />
  if (selection.length > 1) return <MultiInspector />
  return (
    <div className="bp-inspector-body">
      <InspectorTabs tab={tab} setTab={setTab} />
      {tab === 'connections' ? (
        <ConnectionsPanel />
      ) : (
        <div className="bp-inspector-scroll">
        </div>
      )}
    </div>
  )
}

function InspectorTabs({ tab, setTab }: { tab: InspectorTab; setTab: (t: InspectorTab) => void }) {
  return (
    <div className="bp-inspector-tabs">
      <button className={`bp-inspector-tab ${tab === 'style' ? 'active' : ''}`} onClick={() => setTab('style')}>Style</button>
      <button className={`bp-inspector-tab ${tab === 'properties' ? 'active' : ''}`} onClick={() => setTab('properties')}>Properties</button>
      <button className={`bp-inspector-tab ${tab === 'connections' ? 'active' : ''}`} onClick={() => setTab('connections')}>Connections</button>
    </div>
  )
}

function NodeInspector({ nodeId, tab, setTab }: { nodeId: string; tab: InspectorTab; setTab: (t: InspectorTab) => void }) {
  const node = useBlueprint((s) => s.doc.nodes.find((n) => n.id === nodeId))
  const updateNode = useBlueprint((s) => s.updateNode)
  const updateNodeStyle = useBlueprint((s) => s.updateNodeStyle)
  if (!node) return null
  const st = node.style

  return (
    <div className="bp-inspector-body">
      <InspectorTabs tab={tab} setTab={setTab} />

      {tab === 'style' && (
        <div className="bp-inspector-scroll">
          {/* SHAPE */}
          <Section title="Shape" divider={false}>
            <div className="bp-shape-grid">
              {SHAPES.map((s) => (
                <button key={s.value} title={s.label} className={`bp-shape-btn ${st.shape === s.value ? 'on' : ''}`}
                  onClick={() => updateNodeStyle(nodeId, { shape: s.value })}>
                  <span className={`bp-shape-thumb thumb-${s.value}`} aria-hidden />
                  <span className="bp-shape-name">{s.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* BACKGROUND */}
          <Section title="Background">
            <div className="bp-bg-swatches">
              {BG_SWATCHES.map((c) => (
                <button key={c} className={`bp-bg-swatch ${st.bgColor === c ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => updateNodeStyle(nodeId, { bgColor: c })} />
              ))}
              <button className="bp-bg-swatch bp-bg-swatch-add" onClick={() => {
                const c = prompt('Color hex?', st.bgColor)
                if (c) updateNodeStyle(nodeId, { bgColor: c })
              }}>+</button>
            </div>
          </Section>

          {/* BORDER */}
          <Section title="Border">
            <div className="bp-border-row">
              <div className="bp-border-swatch" style={{ background: st.borderColor }} />
              <input className="bp-text bp-border-hex" value={st.borderColor} onChange={(e) => updateNodeStyle(nodeId, { borderColor: e.target.value })} />
              <div className="bp-border-width">
                <select className="bp-text" value={st.borderWidth} onChange={(e) => updateNodeStyle(nodeId, { borderWidth: Number(e.target.value) })}>
                  {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((w) => (
                    <option key={w} value={w}>{w} px</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

          {/* TEXT */}
          <Section title="Text">
            <div className="bp-text-font-row">
              <select className="bp-text bp-font-select" value={st.font}
                onChange={(e) => updateNodeStyle(nodeId, { font: e.target.value })}>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <div className="bp-text-size">
                <select className="bp-text" value={st.fontSize}
                  onChange={(e) => updateNodeStyle(nodeId, { fontSize: Number(e.target.value) })}>
                  {[11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 42].map((s) => (
                    <option key={s} value={s}>{s} px</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="bp-text-format-row">
              <div className="bp-align-group">
                <button className={`bp-align-btn ${st.align === 'left' ? 'on' : ''}`} onClick={() => updateNodeStyle(nodeId, { align: 'left' })}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M2 6h8M2 9h10M2 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
                <button className={`bp-align-btn ${st.align === 'center' ? 'on' : ''}`} onClick={() => updateNodeStyle(nodeId, { align: 'center' })}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M4 6h8M3 9h10M5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
                <button className={`bp-align-btn ${st.align === 'right' ? 'on' : ''}`} onClick={() => updateNodeStyle(nodeId, { align: 'right' })}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M6 6h8M4 9h10M8 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="bp-weight-group">
                <button className={`bp-weight-btn ${st.fontWeight === 700 ? 'on' : ''}`} onClick={() => updateNodeStyle(nodeId, { fontWeight: 700 })}>B</button>
                <button className={`bp-weight-btn ${st.fontWeight === 400 && !st.underline ? 'on' : ''}`} onClick={() => updateNodeStyle(nodeId, { fontWeight: 400 })}>I</button>
                <button className={`bp-weight-btn ${st.underline ? 'on' : ''}`} onClick={() => updateNodeStyle(nodeId, { underline: !st.underline })}>U</button>
              </div>
            </div>
          </Section>

          {/* TEXT COLOR */}
          <Section title="Text Color">
            <div className="bp-text-color-row">
              <div className="bp-text-color-swatch" style={{ background: st.textColor }} />
              <input className="bp-text bp-border-hex" value={st.textColor} onChange={(e) => updateNodeStyle(nodeId, { textColor: e.target.value })} />
              <input type="color" value={st.textColor} className="bp-border-color" onChange={(e) => updateNodeStyle(nodeId, { textColor: e.target.value })} />
            </div>
          </Section>

          {/* NODE SIZE */}
          <Section title="Node Size">
            <div className="bp-node-size-group">
              {(['S', 'M', 'L'] as const).map((sz) => {
                const sizes = { S: 140, M: 200, L: 280 }
                const isOn = node.w === sizes[sz]
                return (
                  <button key={sz} className={`bp-size-btn ${isOn ? 'on' : ''}`}
                    onClick={() => updateNode(nodeId, { w: sizes[sz] })}>{sz}</button>
                )
              })}
            </div>
          </Section>

          {/* PADDING */}
          <Section title="Padding">
            <div className="bp-padding-row">
              <span className="bp-padding-val">{st.borderRadius ?? st.radius}px</span>
              <input type="range" className="bp-slider-input" min={8} max={32} value={st.radius}
                onChange={(e) => updateNodeStyle(nodeId, { radius: Number(e.target.value) })} />
              <span className="bp-padding-val">10 px</span>
            </div>
          </Section>

          {/* ROUNDING */}
          <Section title="Rounding">
            <div className="bp-padding-row">
              <span className="bp-padding-val">{st.radius}px</span>
              <input type="range" className="bp-slider-input" min={0} max={40} value={st.radius}
                onChange={(e) => updateNodeStyle(nodeId, { radius: Number(e.target.value) })} />
              <span className="bp-padding-val">{st.radius} px</span>
            </div>
          </Section>
        </div>
      )}

      {tab === 'properties' && (
        <div className="bp-inspector-scroll">
          <NodeActions nodeId={nodeId} />
          <Section title="Content" divider={false}>
            <Field label="Label">
              <input className="bp-text" value={node.label ?? ''} onChange={(e) => updateNode(nodeId, { label: e.target.value })} />
            </Field>
            <Field label="Tags (comma separated)">
              <input className="bp-text" value={node.tags.join(', ')}
                onChange={(e) => updateNode(nodeId, { tags: e.target.value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean) })} />
            </Field>
          </Section>
          <Section title="Image">
            <Field label="URL">
              <input className="bp-text" placeholder="https://…" value={node.media?.url ?? ''}
                onChange={(e) => updateNode(nodeId, { media: e.target.value ? { kind: 'image', url: e.target.value } : null })} />
            </Field>
          </Section>
          <Section title="Decorations">
            <Field label="Icon">
              <div className="bp-emoji-grid">
                <button className={`bp-emoji ${!node.icon ? 'on' : ''}`} onClick={() => updateNode(nodeId, { icon: null })}>∅</button>
                {['●', '▲', '■', '◆', '✦', '✚', '◉'].map((i) => (
                  <button key={i} className={`bp-emoji ${node.icon === i ? 'on' : ''}`} onClick={() => updateNode(nodeId, { icon: i })}>{i}</button>
                ))}
              </div>
            </Field>
            <Field label="Sticker">
              <input className="bp-text" placeholder="emoji" value={node.sticker ?? ''}
                onChange={(e) => updateNode(nodeId, { sticker: e.target.value || null })} />
            </Field>
          </Section>
        </div>
      )}

      {tab === 'connections' && <ConnectionsPanel />}
    </div>
  )
}

function ConnectionsPanel() {
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const activeTypeId = useBlueprint((s) => s.activeTypeId)
  const setActiveType = useBlueprint((s) => s.setActiveType)
  const addConnectionType = useBlueprint((s) => s.addConnectionType)
  const updateConnectionType = useBlueprint((s) => s.updateConnectionType)
  const deleteConnectionType = useBlueprint((s) => s.deleteConnectionType)

  const activeYarnColor = useBlueprint((s) => s.activeYarnColor)
  const activeYarnStyle = useBlueprint((s) => s.activeYarnStyle)
  const setActiveYarnColor = useBlueprint((s) => s.setActiveYarnColor)
  const setActiveYarnStyle = useBlueprint((s) => s.setActiveYarnStyle)

  const active = types.find((t) => t.id === activeTypeId)

  return (
    <div className="bp-inspector-scroll">
      <Section title="Threads" divider={false}>

        <div className="bp-conn-rows">
          {types.map((t) => (
            <div
              key={t.id}
              className={`bp-conn-row ${activeTypeId === t.id ? 'active' : ''} ${t.hidden ? 'is-hidden' : ''}`}
              style={{ ['--chip' as string]: t.color }}
              onClick={() => setActiveType(t.id)}
            >
              <label className="bp-conn-swatch" style={{ ['--sw' as string]: t.color } as React.CSSProperties} title="Colour">
                <input type="color" value={toColorHex(t.color)} onChange={(e) => updateConnectionType(t.id, { color: e.target.value })} onClick={(e) => e.stopPropagation()} />
              </label>
              <input
                className="bp-text bp-conn-name"
                value={t.name}
                placeholder="Thread name"
                onChange={(e) => updateConnectionType(t.id, { name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
              {t.hidden && <span className="bp-conn-hidden-tag">hidden</span>}
              {types.length > 1 && (
                <button
                  className="bp-ic bp-ic-danger"
                  title="Delete"
                  onClick={(e) => { e.stopPropagation(); deleteConnectionType(t.id) }}
                >✕</button>
              )}
            </div>
          ))}
        </div>
        <button
          className="sf-btn bp-conn-add"
          onClick={() => { const id = addConnectionType('New thread'); setActiveType(id) }}
        >
          <span className="bp-plus">＋</span> Custom thread
        </button>
      </Section>

      <Section title="Selected thread style">
        {active ? (
          <>
            <Field label="Icon">
              <input
                className="bp-text"
                value={active.icon ?? ''}
                maxLength={2}
                placeholder="•"
                onChange={(e) => updateConnectionType(active.id, { icon: e.target.value })}
              />
            </Field>
            <Field label="Line">
              <div className="bp-seg">
                <button className={(active.lineStyle ?? 'solid') === 'solid' ? 'on' : ''} onClick={() => updateConnectionType(active.id, { lineStyle: 'solid' })}>Solid</button>
                <button className={(active.lineStyle ?? 'solid') === 'dashed' ? 'on' : ''} onClick={() => updateConnectionType(active.id, { lineStyle: 'dashed' })}>Dashed</button>
                <button className={(active.lineStyle ?? 'solid') === 'animated' ? 'on' : ''} onClick={() => updateConnectionType(active.id, { lineStyle: 'animated' })}>Pulse</button>
              </div>
            </Field>
            <Field label="Show on wall">
              <div className="bp-seg">
                <button className={!active.hidden ? 'on' : ''} onClick={() => updateConnectionType(active.id, { hidden: false })}>Yes</button>
                <button className={active.hidden ? 'on' : ''} onClick={() => updateConnectionType(active.id, { hidden: true })}>No</button>
              </div>
            </Field>
          </>
        ) : (
          <p className="bp-ins-hint">Select a thread above to edit its style.</p>
        )}
      </Section>

      <Section title="Yarn colour">
        <div className="bp-yarn-custom">
          <label className="bp-conn-swatch lg" style={{ ['--sw' as string]: activeYarnColor ?? '#281C12' } as React.CSSProperties} title="Pick yarn colour">
            <input type="color" value={activeYarnColor ?? '#281C12'} onChange={(e) => setActiveYarnColor(e.target.value)} />
          </label>
          <button
            className={`sf-btn secondary ${!activeYarnColor ? 'on' : ''}`}
            onClick={() => setActiveYarnColor(null)}
          >Use thread colour</button>
        </div>
        <Field label="Yarn style">
          <div className="bp-seg">
            {YARN_STYLE_META.map((s) => (
              <button key={s.value} className={activeYarnStyle === s.value ? 'on' : ''} onClick={() => setActiveYarnStyle(s.value)}>{s.label}</button>
            ))}
          </div>
        </Field>
      </Section>
    </div>
  )
}

function toColorHex(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#ffffff'
}

function NodeActions({ nodeId }: { nodeId: string }) {
  const node = useBlueprint((s) => s.doc.nodes.find((n) => n.id === nodeId))
  const duplicateNodes = useBlueprint((s) => s.duplicateNodes)
  const deleteNodes = useBlueprint((s) => s.deleteNodes)
  const setLocked = useBlueprint((s) => s.setLocked)
  if (!node) return null
  return (
    <div className="bp-ins-actions">
      <button className="sf-btn secondary" onClick={() => duplicateNodes([nodeId])}>Duplicate</button>
      <button className="sf-btn secondary" onClick={() => setLocked([nodeId], !node.locked)}>{node.locked ? 'Unlock' : 'Lock'}</button>
      <button className="sf-btn secondary danger" onClick={() => deleteNodes([nodeId])}>Delete</button>
    </div>
  )
}

function MultiInspector() {
  const selection = useBlueprint((s) => s.selection)
  const groupNodes = useBlueprint((s) => s.groupNodes)
  const ungroupNodes = useBlueprint((s) => s.ungroupNodes)
  const duplicateNodes = useBlueprint((s) => s.duplicateNodes)
  const deleteNodes = useBlueprint((s) => s.deleteNodes)
  const setLocked = useBlueprint((s) => s.setLocked)
  return (
    <div className="bp-inspector-body">
      <p className="bp-ins-hint">{selection.length} notes selected</p>
      <div className="bp-ins-actions col">
        <button className="sf-btn secondary" onClick={() => groupNodes(selection)}>Group</button>
        <button className="sf-btn secondary" onClick={() => ungroupNodes(selection)}>Ungroup</button>
        <button className="sf-btn secondary" onClick={() => duplicateNodes(selection)}>Duplicate all</button>
        <button className="sf-btn secondary" onClick={() => setLocked(selection, true)}>Lock all</button>
        <button className="sf-btn secondary" onClick={() => setLocked(selection, false)}>Unlock all</button>
        <button className="sf-btn secondary danger" onClick={() => deleteNodes(selection)}>Delete all</button>
      </div>
    </div>
  )
}

function EdgeInspector({ edgeId }: { edgeId: string }) {
  const edge = useBlueprint((s) => s.doc.edges.find((e) => e.id === edgeId))
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const updateEdge = useBlueprint((s) => s.updateEdge)
  const deleteEdge = useBlueprint((s) => s.deleteEdge)
  if (!edge) return null
  const type = types.find((t) => t.id === edge.typeId)
  return (
    <div className="bp-inspector-body">
      <p className="bp-ins-hint">Connection: {type?.icon} {type?.name}</p>
      <Section title="Connection">
        <Field label="Type">
          <select className="bp-text" value={edge.typeId} onChange={(e) => updateEdge(edgeId, { typeId: e.target.value })}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Label">
          <input className="bp-text" value={edge.label ?? ''} onChange={(e) => updateEdge(edgeId, { label: e.target.value })} />
        </Field>
      </Section>
      <Section title="Style">
        <Field label="Thickness">
          <div className="bp-padding-row">
            <input type="range" className="bp-slider-input" min={1} max={8} step={0.5} value={edge.thickness ?? type?.thickness ?? 2.5}
              onChange={(e) => updateEdge(edgeId, { thickness: Number(e.target.value) })} />
            <span className="bp-padding-val">{edge.thickness ?? type?.thickness ?? 2.5} px</span>
          </div>
        </Field>
        <Field label="Curve">
          <div className="bp-seg">
            <button className={(edge.curve ?? type?.curve ?? 'curved') === 'curved' ? 'on' : ''}
              onClick={() => updateEdge(edgeId, { curve: 'curved' })}>Curved</button>
            <button className={(edge.curve ?? type?.curve ?? 'curved') === 'straight' ? 'on' : ''}
              onClick={() => updateEdge(edgeId, { curve: 'straight' })}>Straight</button>
          </div>
        </Field>
      </Section>
      <button className="sf-btn secondary danger" onClick={() => deleteEdge(edgeId)}>Delete connection</button>
    </div>
  )
}

function Section({ title, children, divider = false }: { title: string; children: React.ReactNode; divider?: boolean }) {
  return (
    <>
      {divider && <div className="bp-divider" />}
      <div className="bp-section">
        <h4 className="bp-section-title">{title}</h4>
        {children}
      </div>
    </>
  )
}
