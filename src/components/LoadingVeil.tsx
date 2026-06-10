import './LoadingVeil.css'

export function LoadingVeil({ label = 'Entering the forest…' }: { label?: string }) {
  return (
    <div className="veil">
      <div className="veil-orb">
        <span className="veil-leaf" />
      </div>
      <div className="veil-label">{label}</div>
    </div>
  )
}
