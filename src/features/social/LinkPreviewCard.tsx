import { type LinkPreview } from '../../lib/types'
import { PROVIDER_BADGE } from './linkPreview'

export function LinkPreviewCard({ preview, onOpen }: { preview: LinkPreview; onOpen?: () => void }) {
  const badge = PROVIDER_BADGE[preview.provider] ?? PROVIDER_BADGE.web
  return (
    <button
      type="button"
      className="sh-link"
      style={{ ['--prov' as string]: badge.color }}
      onClick={onOpen}
    >
      {preview.image ? (
        <span className="sh-link-thumb" style={{ backgroundImage: `url(${preview.image})` }} />
      ) : (
        <span className="sh-link-thumb sh-link-thumb--icon" style={{ background: badge.color }}>
          {badge.label.charAt(0)}
        </span>
      )}
      <span className="sh-link-body">
        <span className="sh-link-badge">{badge.label}</span>
        <span className="sh-link-title">{preview.title}</span>
        <span className="sh-link-sub">{preview.subtitle}</span>
        <span className="sh-link-host">{preview.host}</span>
      </span>
    </button>
  )
}
