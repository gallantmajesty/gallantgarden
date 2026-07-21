import './ComingSoonModal.css'

interface ComingSoonModalProps {
  open: boolean
  title: string
  description: string
  image: string
  onClose: () => void
}

export function ComingSoonModal({ open, title, description, image, onClose }: ComingSoonModalProps) {
  if (!open) return null

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cs-modal-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="cs-modal-image">
          <img src={image} alt={title} />
        </div>

        <div className="cs-modal-content">
          <h2 className="cs-modal-title">{title}</h2>
          <p className="cs-modal-desc">{description}</p>
        </div>

        <div className="cs-modal-footer">
          <span className="cs-modal-badge">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
