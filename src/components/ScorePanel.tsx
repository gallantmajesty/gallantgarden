import { useTranslation } from 'react-i18next'
import { Swords, X } from 'lucide-react'
import './ScorePanel.css'

export function ScorePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal water-glass" onClick={(e) => e.stopPropagation()}>
        <header className="sp-top">
          <div className="sp-title">
            <span className="sp-kicker">Analytics</span>
            <h2><Swords size={19} strokeWidth={1.8} className="sp-title-ico" /> Focus Score</h2>
          </div>
          <button className="sp-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className="sp-body">
          <div className="sp-comingsoon">
            <Swords size={36} strokeWidth={1.5} className="sp-comingsoon-ico" />
            <h3>Focus Score</h3>
            <p>Coming soon — we're rebuilding this dashboard on trustworthy, real data.</p>
          </div>
        </div>

        <button className="sf-btn water sp-close-btn" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
