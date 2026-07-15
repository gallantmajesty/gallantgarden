import { useMemo } from 'react'
import { useMagnet } from '../../../store/magnet'
import { useTranslation } from 'react-i18next'
import { MgModal, Panel, EmptyState } from '../ui'
import { Icon } from '../Icon'
import { computeStats, addDays } from '../../../lib/magnet/insights'
import { PRIORITY_META } from '../../../lib/magnet/types'
import type { Priority } from '../../../lib/magnet/types'
import './WeeklyReview.css'

const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']

function startOfToday(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function WeeklyReview({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)

  const review = useMemo(() => {
    const now = new Date()
    const today = startOfToday(now)
    const weekStart = addDays(today, -7)

    const doneThisWeek = data.tasks
      .filter((tk) => tk.done && tk.completedAt && new Date(tk.completedAt) >= weekStart)
      .sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1))

    const focusMinutes = data.focus
      .filter((f) => new Date(f.date) >= weekStart)
      .reduce((s, f) => s + f.minutes, 0)

    const openTasks = data.tasks.filter((tk) => !tk.done)
    const missed = openTasks
      .filter((tk) => tk.due && startOfToday(new Date(tk.due)) < today)
      .sort((a, b) => PRIORITY_ORDER.indexOf(b.priority) - PRIORITY_ORDER.indexOf(a.priority))

    const openByPriority = (p: Priority) =>
      openTasks.filter((tk) => tk.priority === p)
        .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))

    const highOpen = [...openByPriority('urgent'), ...openByPriority('high')]
    const topOpen = highOpen.slice(0, 3)

    const stats = computeStats(data, now, 7)
    const activity = doneThisWeek.length + focusMinutes + openTasks.length + stats.created

    return {
      now,
      today,
      weekStart,
      doneThisWeek: doneThisWeek.slice(0, 8),
      doneCount: doneThisWeek.length,
      focusMinutes,
      missed: missed.slice(0, 8),
      missedCount: missed.length,
      topOpen,
      topOpenCount: highOpen.length,
      stats,
      activity,
    }
  }, [data])

  const suggestion = useMemo(() => {
    if (review.topOpenCount > 0) {
      const names = review.topOpen.map((tk) => tk.title)
      const more = review.topOpenCount > 3 ? ` ${t('review.hint')}` : ''
      return {
        icon: 'target' as const,
        body: names.join(', ') + more,
      }
    }
    return {
      icon: 'bulb' as const,
      body: t('review.hint'),
    }
  }, [review, t])

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <MgModal open title={t('review.title')} onClose={onClose} width={520}>
      <p className="wr-subtitle">{t('review.subtitle')}</p>

      {review.activity === 0 ? (
        <EmptyState icon="calendar" title={t('review.empty')} body={t('review.hint')} />
      ) : (
        <div className="wr-body">
          <div className="wr-stats">
            <div className="wr-stat">
              <span className="wr-stat-ico wr-accent">
                <Icon name="check" size={20} />
              </span>
              <strong>{review.doneCount}</strong>
              <span>{t('review.doneThisWeek')}</span>
            </div>
            <div className="wr-stat">
              <span className="wr-stat-ico wr-accent2">
                <Icon name="sparkle" size={20} />
              </span>
              <strong>{review.focusMinutes}</strong>
              <span>{t('review.wins')}</span>
            </div>
            <div className="wr-stat">
              <span className="wr-stat-ico wr-soft">
                <Icon name="trophy" size={20} />
              </span>
              <strong>{Math.round(review.stats.completionRate * 100)}%</strong>
              <span>{t('review.wins')}</span>
            </div>
          </div>

          <Panel className="wr-section">
            <div className="wr-section-head">
              <Icon name="check" size={18} />
              <h3>{t('review.doneThisWeek')}</h3>
              <span className="wr-count">{review.doneCount}</span>
            </div>
            {review.doneCount === 0 ? (
              <p className="wr-note">{t('review.empty')}</p>
            ) : (
              <ul className="wr-list">
                {review.doneThisWeek.map((tk) => (
                  <li key={tk.id}>
                    <span className="wr-dot" style={{ background: PRIORITY_META[tk.priority].color }} />
                    <span className="wr-title">{tk.title}</span>
                    {tk.completedAt && <span className="wr-meta">{fmtDate(tk.completedAt)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="wr-section">
            <div className="wr-section-head">
              <Icon name="calendar" size={18} />
              <h3>{t('review.missed')}</h3>
              <span className="wr-count">{review.missedCount}</span>
            </div>
            {review.missedCount === 0 ? (
              <p className="wr-note">{t('review.empty')}</p>
            ) : (
              <ul className="wr-list">
                {review.missed.map((tk) => (
                  <li key={tk.id}>
                    <span className="wr-dot" style={{ background: PRIORITY_META[tk.priority].color }} />
                    <span className="wr-title">{tk.title}</span>
                    {tk.due && <span className="wr-meta wr-over">{fmtDate(tk.due)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="wr-section wr-next">
            <div className="wr-section-head">
              <Icon name={suggestion.icon} size={18} />
              <h3>{t('review.nextFocus')}</h3>
            </div>
            <p className="wr-note">{suggestion.body}</p>
          </Panel>
        </div>
      )}

      <div className="wr-footer">
        <button className="wr-close" onClick={onClose}>
          {t('review.close')}
        </button>
      </div>
    </MgModal>
  )
}
