import { useState, useCallback } from 'react'
import { useBlueprint } from '../../store/blueprint'
import { YARN_COLORS, YARN_STYLE_META } from '../../lib/blueprint/types'

interface YarnPaletteProps {
  compact?: boolean
}

export function YarnPalette({ compact = false }: YarnPaletteProps) {
  const activeYarnColor = useBlueprint((s) => s.activeYarnColor)
  const activeYarnStyle = useBlueprint((s) => s.activeYarnStyle)
  const setActiveYarnColor = useBlueprint((s) => s.setActiveYarnColor)
  const setActiveYarnStyle = useBlueprint((s) => s.setActiveYarnStyle)

const pickColor = useCallback(
    (hex: string | null) => {
      setActiveYarnColor(hex)
      setPickerOpen(false)
    },
    [setActiveYarnColor],
  )

  const currentColor = activeYarnColor ?? 'var(--mg-accent, #c0392b)'

  return (
    <div className={`bp-yarnpalette ${compact ? 'compact' : ''}`}>
      <span className="bp-yarnpalette-label" title="Active yarn colour">🧵</span>
      <div className="bp-yarnpalette-swatches">
        <button
          className={`bp-yarnswatch ${!activeYarnColor ? 'active' : ''}`}
          style={{ '--sw': 'var(--mg-accent, #c0392b)' } as React.CSSProperties}
          title="Use thread type colour"
          onClick={() => pickColor(null)}
        />
        {YARN_COLORS.map((c) => (
          <button
            key={c.hex}
            className={`bp-yarnswatch ${activeYarnColor === c.hex ? 'active' : ''}`}
            style={{ '--sw': c.hex } as React.CSSProperties}
            title={c.name}
            onClick={() => pickColor(c.hex)}
          />
        ))}
      </div>
      {!compact && (
        <div className="bp-yarnpalette-styles">
          {YARN_STYLE_META.map((s) => (
            <button
              key={s.value}
              className={`bp-yarnstyle-btn ${activeYarnStyle === s.value ? 'active' : ''}`}
              title={s.label}
              onClick={() => setActiveYarnStyle(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {!compact && (
        <label className="bp-yarnpalette-custom" title="Custom hex colour">
          🎨
          <input
            type="color"
            value={currentColor}
            onChange={(e) => pickColor(e.target.value)}
          />
        </label>
      )}
    </div>
  )
}
