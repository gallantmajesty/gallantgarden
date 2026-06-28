import { useTranslation } from 'react-i18next'
import './LoadingVeil.css'

export function LoadingVeil({ label }: { label?: string }) {
  const { t } = useTranslation()
  const displayLabel = label ?? t('loadingVeil.default')
  return (
    <div className="veil">
      <div className="veil-orb">
        <span className="veil-leaf" />
      </div>
      <div className="veil-label">{displayLabel}</div>
    </div>
  )
}