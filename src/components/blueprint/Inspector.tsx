import { useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { uploadMedia } from '../../lib/blueprint/sync'
import { FONT_OPTIONS, NOTE_PRESETS, type BgKind, type Curve, type LineStyle, type MediaFit, type MediaPlace, type Shape, type TextAlign } from '../../lib/blueprint/types'
import { ColorRow, Field, Segmented, Select, Slider } from './controls'

// Real shape library — each thumbnail mimics the actual card silhouette so the
// choice is visual, not a cryptic glyph.
const SHAPES: { value: Shape; label: string }[] = [
  { value: 'sticky', label: 'Sticky' },
  { value: 'rounded', label: 'Card' },
  { value: 'rect', label: 'Plain' },
  { value: 'circle', label: 'Bubble' },
  { value: 'hexagon', label: 'Hex' },
  { value: 'folder', label: 'Folder' },
  { value: 'document', label: 'Document' },
  { value: 'polaroid', label: 'Polaroid' },
  { value: 'bookmark', label: 'Bookmark' },
  { value: 'card', label: 'Tag' },
]
const ICONS = ['📌', '⭐', '🔥', '💡', '✅', '❗', '🎯', '📚', '🧠', '⚡', '❤️', '🔑', '🧪', '📐']
const STICKERS = ['🦊', '🌸', '🌟', '🚀', '🌈', '🍀', '💎', '🎨', '🦉', '🐱', '🌙', '☀️', '🍎', '🧩']
const GRADIENTS = [
  'linear-gradient(135deg, #ffe27a, #ffb24d)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #ff9a9e, #fad0c4)',
  'linear-gradient(135deg, #30cfd0, #330867)',
  'linear-gradient(135deg, #f6d365, #fda085)',
]

export function Inspector() {
  const doc = useBlueprint((s) => s.doc)
  const selection = useBlueprint((s) => s.selection)
  const selectedEdgeId = useBlueprint((s) => s.selectedEdgeId)

  if (selectedEdgeId) return <EdgeInspector edgeId={selectedEdgeId} />
  if (selection.length === 1) return <NodeInspector nodeId={selection[0]} />
  if (selection.length > 1) return <MultiInspector />
  return (
    <div className="bp-inspector-empty">
      <p className="bp-ins-hint">Select a note to style it, or an edge to restyle the string.</p>
      <Field label={`Snap to grid (${doc.grid}px)`}>
        <Segmented value={doc.snap ? 'on' : 'off'} options={[{ label: 'Off', value: 'off' }, { label: 'On', value: 'on' }]}
          onChange={() => useBlueprint.getState().toggleSnap()} />
      </Field>
    </div>
  )
}

function NodeInspector({ nodeId }: { nodeId: string }) {
  const node = useBlueprint((s) => s.doc.nodes.find((n) => n.id === nodeId))
  const updateNode = useBlueprint((s) => s.updateNode)
  const updateNodeStyle = useBlueprint((s) => s.updateNodeStyle)
  const [uploading, setUploading] = useState(false)
  if (!node) return null
  const st = node.style

  async function onUpload(file: File, kind: 'image' | 'gif') {
    setUploading(true)
    const url = await uploadMedia(file)
    setUploading(false)
    if (url) updateNode(nodeId, { media: { kind, url } })
  }

  const media = node.media

  return (
    <div className="bp-inspector-body">
      <NodeActions nodeId={nodeId} />

      <Section title="Style">
        <div className="bp-preset-grid">
          {NOTE_PRESETS.map((p) => (
            <button key={p.id} className="bp-preset" title={p.name}
              onClick={() => updateNodeStyle(nodeId, p.patch)}>
              <span className="bp-preset-swatch" style={{ background: p.swatch }} />
              <span className="bp-preset-name">{p.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Shape">
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

      <Section title="Appearance">
        <Field label="Background">
          <Segmented<BgKind> value={st.bgKind}
            options={[{ label: 'Solid', value: 'solid' }, { label: 'Grad', value: 'gradient' }, { label: 'Glass', value: 'glass' }, { label: 'Paper', value: 'paper' }, { label: 'Theme', value: 'theme' }]}
            onChange={(v) => updateNodeStyle(nodeId, { bgKind: v })} />
        </Field>
        {(st.bgKind === 'solid' || st.bgKind === 'paper') && (
          <Field label="Fill colour"><ColorRow value={st.bgColor} onChange={(v) => updateNodeStyle(nodeId, { bgColor: v })} /></Field>
        )}
        {st.bgKind === 'gradient' && (
          <Field label="Gradient">
            <div className="bp-grad-grid">
              {GRADIENTS.map((g) => (
                <button key={g} className={`bp-grad-swatch ${st.gradient === g ? 'on' : ''}`} style={{ background: g }}
                  onClick={() => updateNodeStyle(nodeId, { gradient: g })} />
              ))}
            </div>
          </Field>
        )}
        <Field label="Border colour"><ColorRow value={st.borderColor} onChange={(v) => updateNodeStyle(nodeId, { borderColor: v })} /></Field>
        <Field label="Border width"><Slider value={st.borderWidth} min={0} max={8} step={0.5} onChange={(v) => updateNodeStyle(nodeId, { borderWidth: v })} suffix="px" /></Field>
        <Field label="Corner radius"><Slider value={st.radius} min={0} max={40} onChange={(v) => updateNodeStyle(nodeId, { radius: v })} suffix="px" /></Field>
        <Field label="Shadow"><Slider value={st.shadow} min={0} max={1} step={0.05} onChange={(v) => updateNodeStyle(nodeId, { shadow: v })} /></Field>
        <Field label="Glow"><Slider value={st.glow} min={0} max={1} step={0.05} onChange={(v) => updateNodeStyle(nodeId, { glow: v })} /></Field>
        <Field label="Opacity"><Slider value={st.opacity} min={0.2} max={1} step={0.05} onChange={(v) => updateNodeStyle(nodeId, { opacity: v })} /></Field>
      </Section>

      <Section title="Image">
        <Field label="Image / GIF URL">
          <input className="bp-text" placeholder="https://…" value={media?.url ?? ''}
            onChange={(e) => updateNode(nodeId, { media: e.target.value ? { ...media, kind: /\.gif($|\?)/i.test(e.target.value) ? 'gif' : 'image', url: e.target.value } : null })} />
        </Field>
        <div className="bp-upload-row">
          <label className="sf-btn secondary bp-upload">
            {uploading ? 'Uploading…' : media?.url ? 'Replace' : 'Upload image'}
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], 'image')} />
          </label>
          {media && <button className="sf-btn secondary danger" onClick={() => updateNode(nodeId, { media: null })}>Remove</button>}
        </div>
        {media?.url && (
          <>
            <Field label="Placement">
              <Segmented<MediaPlace> value={media.place ?? 'top'}
                options={[{ label: 'Banner', value: 'top' }, { label: 'Background', value: 'background' }]}
                onChange={(v) => updateNode(nodeId, { media: { ...media, place: v } })} />
            </Field>
            <Field label="Fit">
              <Segmented<MediaFit> value={media.fit ?? 'cover'}
                options={[{ label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' }, { label: 'Stretch', value: 'fill' }]}
                onChange={(v) => updateNode(nodeId, { media: { ...media, fit: v } })} />
            </Field>
            <Field label="Rotate"><Slider value={media.rotate ?? 0} min={-180} max={180} step={5} onChange={(v) => updateNode(nodeId, { media: { ...media, rotate: v } })} suffix="°" /></Field>
            <Field label="Image opacity"><Slider value={media.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={(v) => updateNode(nodeId, { media: { ...media, opacity: v } })} /></Field>
            {media.place !== 'background' && (
              <Field label="Image radius"><Slider value={media.radius ?? 8} min={0} max={32} onChange={(v) => updateNode(nodeId, { media: { ...media, radius: v } })} suffix="px" /></Field>
            )}
          </>
        )}
      </Section>

      <Section title="Decorations">
        <Field label="Icon badge">
          <div className="bp-emoji-grid">
            <button className={`bp-emoji ${!node.icon ? 'on' : ''}`} onClick={() => updateNode(nodeId, { icon: null })}>∅</button>
            {ICONS.map((i) => (
              <button key={i} className={`bp-emoji ${node.icon === i ? 'on' : ''}`} onClick={() => updateNode(nodeId, { icon: i })}>{i}</button>
            ))}
          </div>
        </Field>
        <Field label="Sticker">
          <div className="bp-emoji-grid">
            <button className={`bp-emoji ${!node.sticker ? 'on' : ''}`} onClick={() => updateNode(nodeId, { sticker: null })}>∅</button>
            {STICKERS.map((i) => (
              <button key={i} className={`bp-emoji ${node.sticker === i ? 'on' : ''}`} onClick={() => updateNode(nodeId, { sticker: i })}>{i}</button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title="Text">
        <Field label="Font"><Select value={st.font} options={FONT_OPTIONS} onChange={(v) => updateNodeStyle(nodeId, { font: v })} /></Field>
        <Field label="Size"><Slider value={st.fontSize} min={11} max={42} onChange={(v) => updateNodeStyle(nodeId, { fontSize: v })} suffix="px" /></Field>
        <Field label="Weight">
          <Segmented value={String(st.fontWeight)}
            options={[{ label: 'Reg', value: '400' }, { label: 'Med', value: '500' }, { label: 'Bold', value: '700' }, { label: 'Black', value: '800' }]}
            onChange={(v) => updateNodeStyle(nodeId, { fontWeight: Number(v) })} />
        </Field>
        <Field label="Align">
          <Segmented<TextAlign> value={st.align}
            options={[{ label: '⬅', value: 'left' }, { label: '⬌', value: 'center' }, { label: '➡', value: 'right' }]}
            onChange={(v) => updateNodeStyle(nodeId, { align: v })} />
        </Field>
        <Field label="Line spacing"><Slider value={st.lineHeight} min={1} max={2.2} step={0.05} onChange={(v) => updateNodeStyle(nodeId, { lineHeight: v })} /></Field>
        <Field label="Underline all">
          <Segmented value={st.underline ? 'on' : 'off'} options={[{ label: 'Off', value: 'off' }, { label: 'On', value: 'on' }]}
            onChange={(v) => updateNodeStyle(nodeId, { underline: v === 'on' })} />
        </Field>
        <Field label="Text colour"><ColorRow value={st.textColor} onChange={(v) => updateNodeStyle(nodeId, { textColor: v })} /></Field>
      </Section>

      <Section title="Content">
        <Field label="Label (for search & minimap)">
          <input className="bp-text" value={node.label ?? ''} onChange={(e) => updateNode(nodeId, { label: e.target.value })} />
        </Field>
        <Field label="Tags (comma separated)">
          <input className="bp-text" value={node.tags.join(', ')}
            onChange={(e) => updateNode(nodeId, { tags: e.target.value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean) })} />
        </Field>
      </Section>
    </div>
  )
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
      <p className="bp-ins-hint">Thread {type?.icon} {type?.name}</p>
      <Section title="Connection">
        <Field label="Type">
          <Select value={edge.typeId} options={types.map((t) => ({ label: t.name, value: t.id }))} onChange={(v) => updateEdge(edgeId, { typeId: v })} />
        </Field>
        <Field label="Label">
          <input className="bp-text" value={edge.label ?? ''} onChange={(e) => updateEdge(edgeId, { label: e.target.value })} />
        </Field>
        <Field label="Colour"><ColorRow value={edge.color ?? type?.color ?? '#8a93a6'} onChange={(v) => updateEdge(edgeId, { color: v })} /></Field>
        <Field label="Thickness"><Slider value={edge.thickness ?? type?.thickness ?? 2.5} min={1} max={8} step={0.5} onChange={(v) => updateEdge(edgeId, { thickness: v })} suffix="px" /></Field>
        <Field label="Style">
          <Segmented<LineStyle> value={edge.lineStyle ?? type?.lineStyle ?? 'solid'}
            options={[{ label: 'Solid', value: 'solid' }, { label: 'Dashed', value: 'dashed' }, { label: 'Animated', value: 'animated' }]}
            onChange={(v) => updateEdge(edgeId, { lineStyle: v })} />
        </Field>
        <Field label="Hang">
          <Segmented<Curve> value={edge.curve ?? type?.curve ?? 'curved'}
            options={[{ label: 'Sag', value: 'curved' }, { label: 'Taut', value: 'straight' }]}
            onChange={(v) => updateEdge(edgeId, { curve: v })} />
        </Field>
        <Field label="Glow"><Slider value={edge.glow ?? type?.glow ?? 0.3} min={0} max={1} step={0.05} onChange={(v) => updateEdge(edgeId, { glow: v })} /></Field>
      </Section>
      <button className="sf-btn secondary danger" onClick={() => deleteEdge(edgeId)}>Cut thread</button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bp-section">
      <h4 className="bp-section-title">{title}</h4>
      {children}
    </div>
  )
}
