import type { ReactNode } from 'react'
import './kit.css'

// Shared building blocks for calculator modules. Every non-keypad calculator
// (converters, finance, health, etc.) is built from these so they all look and
// behave consistently, and a new module only has to describe its fields — not
// re-style inputs, results and layout from scratch.

export function CalcLayout({ children }: { children: ReactNode }) {
  return <div className="calc-form">{children}</div>
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="calc-field">
      <span className="calc-field-label">{label}</span>
      {children}
      {hint && <span className="calc-field-hint">{hint}</span>}
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <span className="calc-input-wrap">
      <input
        className="calc-input"
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span className="calc-input-suffix">{suffix}</span>}
    </span>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      className="calc-input"
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className="calc-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
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
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="calc-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={`calc-seg-btn ${value === o.value ? 'on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Result({
  label,
  value,
  sub,
  big,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  big?: boolean
}) {
  return (
    <div className={`calc-result ${big ? 'big' : ''}`}>
      <span className="calc-result-label">{label}</span>
      <span className="calc-result-value">{value}</span>
      {sub && <span className="calc-result-sub">{sub}</span>}
    </div>
  )
}

export function ResultGrid({ children }: { children: ReactNode }) {
  return <div className="calc-result-grid">{children}</div>
}

/** Parse a string input to a finite number, or null when blank/invalid. */
export function num(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return isFinite(n) ? n : null
}
