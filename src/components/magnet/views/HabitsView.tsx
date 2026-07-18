import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import type { Habit } from '../../../lib/magnet/types'
import { dayKey, addDays } from '../../../lib/magnet/insights'
import { SectionHead, Panel, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'

const HABIT_ICONS = ['fire', 'book', 'brain', 'leaf', 'heart', 'spark', 'sun', 'moon', 'rocket', 'star']
const HABIT_COLORS = ['#ff7a3d', '#46d6a0', '#6c8cff', '#ff6f9c', '#b76cff', '#4fd1e0', '#ffb454']
const GRID_DAYS = 21

// A freeze (rest) day counts the same as a completed day for streak purposes,
// so an intentional off-day never breaks a streak.
function habitStreak(history: string[], freezeDays: string[], now: Date): number {
  const set = new Set([...history, ...freezeDays])
  let streak = 0
  let cursor = set.has(dayKey(now)) ? now : addDays(now, -1)
  while (set.has(dayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function HabitsView() {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const addHabit = useMagnet((s) => s.addHabit)
  const deleteHabit = useMagnet((s) => s.deleteHabit)
  const toggleHabitToday = useMagnet((s) => s.toggleHabitToday)
  const toggleHabitFreeze = useMagnet((s) => s.toggleHabitFreeze)

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState(HABIT_ICONS[0])
  const [color, setColor] = useState(HABIT_COLORS[0])

  const now = useMemo(() => new Date(), [])
  const tk = dayKey(now)
  const gridDays = useMemo(() => {
    const out: string[] = []
    for (let i = GRID_DAYS - 1; i >= 0; i--) out.push(dayKey(addDays(now, -i)))
    return out
  }, [now])

  function save(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    addHabit(t, icon, color)
    setTitle('')
    setIcon(HABIT_ICONS[0])
    setColor(HABIT_COLORS[0])
    setModalOpen(false)
  }

  return (
    <div className="mg-view">
      <SectionHead
        icon="fire"
        title={t('habits.title')}
        subtitle={t('habits.subtitle')}
        action={
          <button className="mg-btn primary" onClick={() => setModalOpen(true)}>
            <Icon name="plus" size={16} />{t('habits.newHabit')}
          </button>
        }
      />

      {data.habits.length === 0 ? (
        <EmptyState
          icon="leaf"
          title={t('habits.emptyTitle')}
          body={t('habits.emptyBody')}
        />
      ) : (
        <div className="mg-habitlist">
          {data.habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              gridDays={gridDays}
              today={tk}
              streak={habitStreak(h.history, h.freezeDays, now)}
              onToggleToday={() => toggleHabitToday(h.id)}
              onFreeze={() => toggleHabitFreeze(h.id)}
              onDelete={() => deleteHabit(h.id)}
            />
          ))}
        </div>
      )}

      <MgModal open={modalOpen} title={t('habits.newHabitModal')} onClose={() => setModalOpen(false)}>
        <form className="mg-form" onSubmit={save}>
          <Field label={t('habits.habitLabel')}>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('habits.habitPlaceholder')} />
          </Field>
          <Field label={t('common.icon')}>
            <div className="mg-iconpick">
              {HABIT_ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`mg-iconopt ${icon === ic ? 'active' : ''}`}
                  onClick={() => setIcon(ic)}
                >
                  <Icon name={ic} size={16} />
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('goals.colorLabel')}>
            <div className="mg-swatches">
              {HABIT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`mg-swatch ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </Field>
          <div className="mg-form-actions">
            <button type="button" className="mg-btn glass" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              Add habit
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}

function HabitRow({
  habit,
  gridDays,
  today,
  streak,
  onToggleToday,
  onFreeze,
  onDelete,
}: {
  habit: Habit
  gridDays: string[]
  today: string
  streak: number
  onToggleToday: () => void
  onFreeze: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const set = useMemo(() => new Set(habit.history), [habit.history])
  const frozenToday = habit.freezeDays.includes(today)
  const doneToday = set.has(today)
  return (
    <Panel className="mg-habitrow" pad={false}>
      <div className="mg-habitrow-inner" style={{ ['--mg-tag' as string]: habit.color }}>
        <div className="mg-habitrow-left">
          <button
            className={`mg-habit-toggle ${doneToday ? 'done' : ''}`}
            onClick={onToggleToday}
            aria-label={t('habits.toggleToday')}
          >
            <Icon name={doneToday ? 'check' : habit.icon} size={18} />
          </button>
          <div className="mg-habitrow-text">
            <strong>{habit.title}</strong>
            <small>
              <Icon name="fire" size={12} /> {streak} day{streak !== 1 ? 's' : ''} · {habit.history.length} total
            </small>
          </div>
        </div>
        <div className="mg-habitgrid">
          {gridDays.map((d) => (
            <span
              key={d}
              className={`mg-habitcell ${set.has(d) ? 'filled' : ''} ${habit.freezeDays.includes(d) ? 'frozen' : ''} ${d === today ? 'today' : ''}`}
              title={d}
            />
          ))}
        </div>
        <div className="mg-habitrow-actions">
          <button
            className={`mg-iconbtn ${frozenToday ? 'active' : ''}`}
            onClick={onFreeze}
            aria-label={t('habits.freezeDay')}
            title={t('habits.freezeHint')}
          >
            <Icon name={frozenToday ? 'moon' : 'sun'} size={15} />
          </button>
          <button className="mg-iconbtn danger" onClick={onDelete} aria-label={t('habits.deleteHabit')}>
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>
    </Panel>
  )
}
