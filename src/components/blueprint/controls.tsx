import type { ReactNode } from 'react'

// Small, consistent inspector controls. Intentionally lightweight — they read
// the theme via the surrounding CSS variables so they re-skin automatically.

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="bp-field">
      <span className="bp-field-label">{label}</span>
      {children}
    </label>
  )
}

export function ColorRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="bp-color">
      <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} />
      <input className="bp-color-text" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    </span>
  )
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <span className="bp-slider">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <em>{Math.round(value * 100) / 100}{suffix}</em>
    </span>
  )
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { label: string; value: T }[]
  onChange: (v: T) => void
}) {
  return (
    <select className="bp-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { label: ReactNode; value: T; title?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <span className="bp-seg">
      {options.map((o) => (
        <button
          key={o.value}
          title={o.title}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  )
}

function toHex(v: string): string {
  // <input type=color> needs a #rrggbb value; fall back for rg/named/gradients.
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#ffffff'
}
