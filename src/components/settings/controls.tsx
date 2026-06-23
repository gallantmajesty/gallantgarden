import type { ReactNode } from 'react'
import { FOCUS_PRESETS, MAX_FOCUS_MIN, MIN_FOCUS_MIN } from '../../store/settings'
import './controls.css'

/**
 * Shared settings control primitives. The Lobby settings panel and the in-world
 * Explore HUD both compose these, so the two surfaces look and behave identically
 * and there's a single place to evolve the styling.
 */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="settings-section">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="set-row">
      <span>{label}</span>
      <button
        type="button"
        className={`set-switch ${value ? 'on' : ''}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
      >
        <span className="set-knob" />
      </button>
    </label>
  )
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  display,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  /** optional read-out shown in the value pill (e.g. "80%"); omit to hide it */
  display?: string
}) {
  // Fill the track up to the current value so the slider reads as a gauge, not a
  // bare line. Exposed as a CSS var the stylesheet paints into the track gradient.
  const pct = max > min ? Math.round(((value - min) / (max - min)) * 100) : 0
  return (
    <div className="set-slider">
      <div className="set-slider-head">
        <span>{label}</span>
        {display !== undefined && <span className="set-slider-val">{display}</span>}
      </div>
      <input
        className="set-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ ['--fill' as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  return (
    <label className="set-row">
      <span>{label}</span>
      <span className="set-stepper">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <b>{value}</b>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))}>
          +
        </button>
      </span>
    </label>
  )
}

export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <label className="set-row col">
      <span>{label}</span>
      <span className="set-seg">
        {options.map(([v, t]) => (
          <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
            {t}
          </button>
        ))}
      </span>
    </label>
  )
}

/** Study-length picker: quick recommended presets plus a Custom mode whose
 *  stepper reaches up to MAX_FOCUS_MIN so 6–8h study blocks are possible. */
export function FocusLength({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const isPreset = (FOCUS_PRESETS as readonly number[]).includes(value)
  const fmt = (m: number) =>
    m >= 60 ? (m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h ${m % 60}m`) : `${m}m`
  return (
    <div className="set-focus">
      <span className="set-focus-label">Study length</span>
      <div className="set-focus-presets">
        {FOCUS_PRESETS.map((p) => (
          <button type="button" key={p} className={value === p ? 'on' : ''} onClick={() => onChange(p)}>
            {fmt(p)}
          </button>
        ))}
        <button type="button" className={!isPreset ? 'on' : ''} onClick={() => onChange(isPreset ? 240 : value)}>
          Custom
        </button>
      </div>
      <div className="set-focus-custom">
        <button type="button" onClick={() => onChange(Math.max(MIN_FOCUS_MIN, value - 5))} aria-label="Shorter">
          −
        </button>
        <b>{fmt(value)}</b>
        <button type="button" onClick={() => onChange(Math.min(MAX_FOCUS_MIN, value + 5))} aria-label="Longer">
          +
        </button>
      </div>
    </div>
  )
}
