import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon'

// Small shared building blocks used across every Task Magnet view. They lean on
// the theme CSS variables (--mg-*) so they restyle themselves with the theme.

// A themed dialog that inherits the active theme (unlike the global Modal, which
// is light-only). Used by every view for add/edit forms.
export function MgModal({
  open,
  title,
  onClose,
  children,
  width = 460,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  if (!open) return null
  return (
    <div className="mg-modal-overlay" onClick={onClose}>
      <div className="mg-modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="mg-modal-head">
          <h2>{title}</h2>
          <button className="mg-modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mg-modal-body">{children}</div>
      </div>
    </div>
  )
}

// A labelled form field wrapper.
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mg-field">
      <span className="mg-field-label">{label}</span>
      {children}
    </label>
  )
}

export function Panel({
  children,
  className = '',
  pad = true,
  style,
}: {
  children: ReactNode
  className?: string
  pad?: boolean
  style?: CSSProperties
}) {
  return <div className={`mg-panel ${pad ? 'pad' : ''} ${className}`} style={style}>{children}</div>
}

export function SectionHead({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mg-sectionhead">
      <div className="mg-sectionhead-left">
        <span className="mg-sectionhead-icon">
          <Icon name={icon} size={22} />
        </span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action && <div className="mg-sectionhead-action">{action}</div>}
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: string
  label: string
  value: string | number
  hint?: string
  tone?: string
}) {
  return (
    <div className="mg-stat" style={tone ? { ['--mg-stat-tone' as string]: tone } : undefined}>
      <span className="mg-stat-icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="mg-stat-value">{value}</div>
      <div className="mg-stat-label">{label}</div>
      {hint && <div className="mg-stat-hint">{hint}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="mg-empty">
      <span className="mg-empty-icon">
        <Icon name={icon} size={34} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <div className="mg-empty-action">{action}</div>}
    </div>
  )
}

export function ProgressRing({
  pct,
  size = 64,
  label,
  sub,
}: {
  pct: number
  size?: number
  label?: string
  sub?: string
}) {
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(1, pct)))
  return (
    <div className="mg-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="mg-ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="mg-ring-fill"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="mg-ring-center">
        {label && <strong>{label}</strong>}
        {sub && <small>{sub}</small>}
      </div>
    </div>
  )
}

// A horizontal mini bar chart used in analytics.
export function MiniBars({
  data,
  color,
  height = 90,
}: {
  data: { label: string; value: number }[]
  color: string
  height?: number
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="mg-bars" style={{ height }}>
      {data.map((d, i) => (
        <div className="mg-bar-col" key={i} title={`${d.label}: ${d.value}`}>
          <div className="mg-bar-track">
            <div
              className="mg-bar-fill"
              style={{ height: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <span className="mg-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
