import { useState } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { type LineStyle } from '../../lib/blueprint/types'
import { ColorRow, Segmented } from './controls'
import { YarnPalette } from './YarnPalette'

// The "case file" — the user's own relationship vocabulary. Clicking a thread
// type makes it active for new strings AND traces it on the wall (its threads
// stay lit, the rest fades). Every thread here is created by the user; the
// manager adds, recolours, re-icons, hides, or removes types.
export function ConnectionBar() {
  const types = useBlueprint((s) => s.doc.connectionTypes)
  const activeTypeId = useBlueprint((s) => s.activeTypeId)
  const focusTypeId = useBlueprint((s) => s.focus.typeId)
  const setActiveType = useBlueprint((s) => s.setActiveType)
  const setFocus = useBlueprint((s) => s.setFocus)
  const cancelConnect = useBlueprint((s) => s.cancelConnect)
  const addConnectionType = useBlueprint((s) => s.addConnectionType)
  const updateConnectionType = useBlueprint((s) => s.updateConnectionType)
  const deleteConnectionType = useBlueprint((s) => s.deleteConnectionType)
  const [manage, setManage] = useState(false)

  function clickChip(id: string) {
    setActiveType(id)
    setFocus(id) // toggles tracing this thread type
  }

  const visible = types.filter((t) => !t.hidden)

  return (
    <div className="bp-connbar bp-surface">
      <span className="bp-connbar-label">{focusTypeId ? 'Tracing' : 'Case file'}</span>
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
            <span className="bp-connchip-name">{t.name}</span>
            {focusTypeId === t.id && (
              <span
                className="bp-connchip-x"
                role="button"
                aria-label="Cancel tracing"
                title="Cancel"
                onClick={(e) => { e.stopPropagation(); cancelConnect() }}
              >
                ×
              </span>
            )}
          </button>
        ))}
        {visible.length === 0 && <span className="bp-connbar-empty">No thread types yet — add one →</span>}
      </div>

      <YarnPalette compact />
      <button className="sf-btn tiny bp-manage-btn" onClick={() => setManage((m) => !m)} aria-label="Manage threads">
        Manage
      </button>

      {manage && (
        <div className="bp-connmanage bp-surface">
          <div className="bp-panel-head">
            <strong>Your threads</strong>
            <span className="bp-connmanage-count">{types.length}</span>
            <button className="bp-x" onClick={() => setManage(false)} aria-label="Close">✕</button>
          </div>

          <div className="bp-connmanage-list">
            {types.map((t) => (
              <div
                key={t.id}
                className={`bp-conncard ${t.hidden ? 'is-hidden' : ''} ${activeTypeId === t.id ? 'is-active' : ''}`}
              >
                <div className="bp-conncard-top">
                  <label className="bp-conncard-swatch" style={{ ['--sw' as string]: t.color } as React.CSSProperties} title="Colour">
                    <input type="color" value={toColorHex(t.color)} onChange={(e) => updateConnectionType(t.id, { color: e.target.value })} />
                  </label>
                  <input
                    className="bp-text bp-conncard-icon"
                    value={t.icon ?? ''}
                    maxLength={2}
                    placeholder="•"
                    onChange={(e) => updateConnectionType(t.id, { icon: e.target.value })}
                    title="Icon"
                  />
                  <input
                    className="bp-text bp-conncard-name"
                    value={t.name}
                    placeholder="Thread name"
                    onChange={(e) => updateConnectionType(t.id, { name: e.target.value })}
                  />
                  <div className="bp-conncard-actions">
                    <button
                      className="bp-ic"
                      title={t.hidden ? 'Show on wall' : 'Hide from wall'}
                      onClick={() => updateConnectionType(t.id, { hidden: !t.hidden })}
                    >
                      {t.hidden ? 'Show' : 'Hide'}
                    </button>
                    {types.length > 1 && (
                      <button className="bp-ic bp-ic-danger" title="Delete" onClick={() => deleteConnectionType(t.id)}>✕</button>
                    )}
                  </div>
                </div>
                <div className="bp-conncard-foot">
                  <Segmented<LineStyle>
                    value={t.lineStyle}
                    options={[{ label: 'Solid', value: 'solid' }, { label: 'Dashed', value: 'dashed' }, { label: 'Pulse', value: 'animated' }]}
                    onChange={(v) => updateConnectionType(t.id, { lineStyle: v })}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            className="sf-btn tiny bp-connmanage-add"
            onClick={() => { const id = addConnectionType('New thread'); setActiveType(id) }}
          >
            <span className="bp-plus">＋</span> Add your own thread
          </button>
        </div>
      )}
    </div>
  )
}

// <input type=color> needs a #rrggbb value; fall back for named/gradient colours.
function toColorHex(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#ffffff'
}
