import { useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { CONNECTION_PACKS, type LineStyle } from '../../lib/blueprint/types'
import { ColorRow, Segmented } from './controls'

// The "case file" — the user's own relationship vocabulary. Clicking a thread
// type makes it active for new strings AND traces it on the wall (its threads
// stay lit, the rest fades). Everything here is user-defined; the manager adds,
// recolours, re-icons, hides, or removes types, and can apply a starter pack.
export function ConnectionBar() {
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const activeTypeId = useBlueprint((s) => s.activeTypeId)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const setActiveType = useBlueprint((s) => s.setActiveType)
  const setFocus = useBlueprint((s) => s.setFocus)
  const addConnectionType = useBlueprint((s) => s.addConnectionType)
  const updateConnectionType = useBlueprint((s) => s.updateConnectionType)
  const deleteConnectionType = useBlueprint((s) => s.deleteConnectionType)
  const applyConnectionPack = useBlueprint((s) => s.applyConnectionPack)
  const [manage, setManage] = useState(false)

  function clickChip(id: string) {
    setActiveType(id)
    setFocus(id) // toggles tracing this thread type
  }

  const visible = types.filter((t) => !t.hidden)

  return (
    <div className="bp-connbar bp-surface">
      <span className="bp-connbar-label">{focusTypeId ? 'Tracing' : 'Threads'}</span>
      <div className="bp-connchips">
        {visible.map((t) => (
          <button
            key={t.id}
            className={`bp-connchip ${activeTypeId === t.id ? 'active' : ''} ${focusTypeId === t.id ? 'focused' : ''}`}
            style={{ ['--chip' as string]: t.color }}
            onClick={() => clickChip(t.id)}
            title={focusTypeId === t.id ? 'Click to stop tracing' : `Draw + trace "${t.name}"`}
          >
            <span className="bp-connchip-dot" />
            {t.icon && <span className="bp-connchip-icon">{t.icon}</span>}
            {t.name}
          </button>
        ))}
        {visible.length === 0 && <span className="bp-connbar-empty">No thread types yet — add one →</span>}
      </div>
      <button className="sf-btn secondary tiny" onClick={() => setManage((m) => !m)}>Manage</button>

      {manage && (
        <div className="bp-connmanage bp-surface">
          <div className="bp-panel-head">
            <strong>Your threads</strong>
            <button className="bp-x" onClick={() => setManage(false)}>✕</button>
          </div>

          <div className="bp-connmanage-list">
            {types.map((t) => (
              <div key={t.id} className={`bp-connmanage-row ${t.hidden ? 'is-hidden' : ''}`}>
                <input
                  className="bp-text bp-connmanage-icon"
                  value={t.icon ?? ''}
                  maxLength={2}
                  placeholder="•"
                  onChange={(e) => updateConnectionType(t.id, { icon: e.target.value })}
                  title="Icon"
                />
                <input className="bp-text" value={t.name} onChange={(e) => updateConnectionType(t.id, { name: e.target.value })} />
                <ColorRow value={t.color} onChange={(v) => updateConnectionType(t.id, { color: v })} />
                <button
                  className="bp-x"
                  title={t.hidden ? 'Show on wall' : 'Hide from wall'}
                  onClick={() => updateConnectionType(t.id, { hidden: !t.hidden })}
                >
                  {t.hidden ? '🙈' : '👁'}
                </button>
                {types.length > 1 && (
                  <button className="bp-x" title="Delete" onClick={() => deleteConnectionType(t.id)}>🗑</button>
                )}
              </div>
            ))}
          </div>

          {/* per-type line style for the active row's quick tuning */}
          <div className="bp-connmanage-style">
            {types.map((t) => (
              <div key={t.id} className="bp-connmanage-stylerow">
                <span className="bp-connmanage-stylename" style={{ color: t.color }}>{t.name}</span>
                <Segmented<LineStyle>
                  value={t.lineStyle}
                  options={[{ label: 'Solid', value: 'solid' }, { label: 'Dashed', value: 'dashed' }, { label: 'Pulse', value: 'animated' }]}
                  onChange={(v) => updateConnectionType(t.id, { lineStyle: v })}
                />
              </div>
            ))}
          </div>

          <button className="sf-btn tiny bp-connmanage-add" onClick={() => { const id = addConnectionType('New thread'); setActiveType(id) }}>
            + Add your own thread
          </button>

          <div className="bp-connpacks">
            <div className="bp-connpacks-label">Starter packs</div>
            <div className="bp-connpacks-grid">
              {CONNECTION_PACKS.map((p) => (
                <button key={p.id} className="bp-connpack" onClick={() => applyConnectionPack(p.id)} title={p.blurb}>
                  <strong>{p.name}</strong>
                  <span>{p.blurb}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
