import type { StudyStatus } from '../../lib/types'
import { STATUS_COLOR } from '../../lib/presence'

// Shared presence dot. One calm colour per status — no flashing, no numbers.
export function StatusDot({ status, size = 9 }: { status: StudyStatus; size?: number }) {
  return (
    <span
      className="sd-dot"
      style={{ width: size, height: size, background: STATUS_COLOR[status] }}
      title={status}
    />
  )
}
