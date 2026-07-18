import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import type { Task, FocusSession, Goal } from '../../../lib/magnet/types'
import { PRIORITY_META } from '../../../lib/magnet/types'
import { SectionHead, EmptyState } from '../ui'
import { Icon } from '../Icon'
import Dock from '../Dock'
import './CalendarView.css'

type Mode = 'month' | 'week'

interface DayCell {
  date: Date
  key: string // yyyy-mm-dd
  inMonth: boolean
  isToday: boolean
}

interface DayItems {
  tasks: Task[]
  focus: FocusSession[]
  goals: Goal[]
}

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Monday-based start of the week containing d.
function startOfWeek(d: Date): Date {
  const out = new Date(d)
  const wd = (out.getDay() + 6) % 7 // 0 = Monday
  out.setDate(out.getDate() - wd)
  out.setHours(0, 0, 0, 0)
  return out
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

export function CalendarView({ onAddTask }: { onAddTask?: (date: string) => void }) {
  const { t, i18n } = useTranslation()
  const data = useMagnet((s) => s.data)

  const [mode, setMode] = useState<Mode>('month')
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)

  const todayKey = iso(new Date())
  const locale = i18n.language || undefined

  // Index events by date once per data change.
  const byDate = useMemo(() => {
    const map = new Map<string, DayItems>()
    const bucket = (k: string): DayItems => {
      let b = map.get(k)
      if (!b) {
        b = { tasks: [], focus: [], goals: [] }
        map.set(k, b)
      }
      return b
    }
    for (const task of data.tasks) if (task.due) bucket(task.due).tasks.push(task)
    for (const f of data.focus) bucket(f.date).focus.push(f)
    for (const g of data.goals) if (g.target) bucket(g.target).goals.push(g)
    return map
  }, [data.tasks, data.focus, data.goals])

  // Build the visible cells for the current mode.
  const cells = useMemo<DayCell[]>(() => {
    const list: DayCell[] = []
    if (mode === 'week') {
      const start = startOfWeek(cursor)
      for (let i = 0; i < 7; i++) {
        const date = addDays(start, i)
        list.push({ date, key: iso(date), inMonth: true, isToday: iso(date) === todayKey })
      }
      return list
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const gridStart = startOfWeek(first)
    for (let i = 0; i < 42; i++) {
      const date = addDays(gridStart, i)
      list.push({
        date,
        key: iso(date),
        inMonth: date.getMonth() === cursor.getMonth(),
        isToday: iso(date) === todayKey,
      })
    }
    return list
  }, [mode, cursor, todayKey])

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    const monday = startOfWeek(new Date())
    return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(monday, i)))
  }, [locale])

  const periodLabel = useMemo(() => {
    if (mode === 'week') {
      const start = startOfWeek(cursor)
      const end = addDays(start, 6)
      const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
      return `${fmt.format(start)} — ${fmt.format(end)}`
    }
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor)
  }, [mode, cursor, locale])

  function step(dir: -1 | 1) {
    setCursor((c) => {
      if (mode === 'week') return addDays(c, dir * 7)
      return new Date(c.getFullYear(), c.getMonth() + dir, 1)
    })
  }
  function goToday() {
    setCursor(new Date())
    setSelected(todayKey)
  }

  const selectedItems = selected ? byDate.get(selected) : undefined
  const hasAnyEvents = byDate.size > 0

  return (
    <div className="mg-view mg-cal">
      <SectionHead
        icon="calendar"
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        action={
          <div className="mg-cal-controls">
            <div className="mg-cal-toggle" role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'month'}
                className={mode === 'month' ? 'active' : ''}
                onClick={() => setMode('month')}
              >
                {t('calendar.month')}
              </button>
              <button
                role="tab"
                aria-selected={mode === 'week'}
                className={mode === 'week' ? 'active' : ''}
                onClick={() => setMode('week')}
              >
                {t('calendar.week')}
              </button>
            </div>
            <button className="mg-btn glass" onClick={goToday}>
              {t('calendar.today')}
            </button>
          </div>
        }
      />

      <div className="mg-cal-bar">
        <button className="mg-iconbtn" onClick={() => step(-1)} aria-label={t('calendar.prev')}>
          <span className="mg-cal-flip">
            <Icon name="chevron" size={18} />
          </span>
        </button>
        <strong className="mg-cal-period">{periodLabel}</strong>
        <button className="mg-iconbtn" onClick={() => step(1)} aria-label={t('calendar.next')}>
          <Icon name="chevron" size={18} />
        </button>
      </div>

      <div className={`mg-cal-grid ${mode}`}>
        {weekdayLabels.map((w) => (
          <div key={w} className="mg-cal-wd">
            {w}
          </div>
        ))}
        {cells.map((cell) => (
          <DayCellView
            key={cell.key}
            cell={cell}
            items={byDate.get(cell.key)}
            selected={selected === cell.key}
            addLabel={t('calendar.addOnDate', { date: cell.key })}
            onSelect={() => setSelected(cell.key)}
            onAddTask={onAddTask ? (d) => onAddTask(d) : undefined}
          />
        ))}
      </div>

      {!hasAnyEvents && (
        <EmptyState icon="calendar" title={t('calendar.noEvents')} body={t('calendar.subtitle')} />
      )}

      {selected && (
        <div className="mg-cal-day">
          <div className="mg-cal-day-headrow">
            <h3 className="mg-cal-day-head">
              {new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(
                new Date(selected + 'T00:00:00'),
              )}
            </h3>
            {onAddTask && (
              <button className="mg-btn small" onClick={() => onAddTask(selected)}>
                <Icon name="plus" size={14} /> {t('calendar.addTask')}
              </button>
            )}
          </div>
          {selectedItems && (selectedItems.tasks.length || selectedItems.focus.length || selectedItems.goals.length) ? (
            <div className="mg-cal-day-lists">
              {selectedItems.tasks.length > 0 && (
                <ul className="mg-cal-list">
                  {selectedItems.tasks.map((task) => (
                    <li key={task.id} style={{ ['--mg-c' as string]: PRIORITY_META[task.priority].color }}>
                      <span className="mg-cal-dot" />
                      <span className={task.done ? 'mg-cal-done' : ''}>{task.title}</span>
                      {task.done && <Icon name="check" size={13} />}
                    </li>
                  ))}
                </ul>
              )}
              {selectedItems.focus.map((f) => (
                <div key={f.id} className="mg-cal-focus">
                  <Icon name="clock" size={14} /> {f.minutes}m · {f.subject}
                </div>
              ))}
              {selectedItems.goals.map((g) => (
                <div key={g.id} className="mg-cal-goal" style={{ ['--mg-c' as string]: g.color }}>
                  <Icon name="target" size={14} /> {g.title}
                </div>
              ))}
            </div>
          ) : (
            <p className="mg-muted">{t('calendar.noEvents')}</p>
          )}
        </div>
      )}

      <div className="mg-cal-dock">
        <Dock
          panelHeight={72}
          baseItemSize={52}
          magnification={74}
          distance={160}
          items={[
            {
              icon: (
                <span className="mg-cal-flip">
                  <Icon name="chevron" size={20} />
                </span>
              ),
              label: t('calendar.prev'),
              onClick: () => step(-1),
            },
            { icon: <Icon name="calendar" size={20} />, label: t('calendar.today'), onClick: goToday },
            { icon: <Icon name="chevron" size={20} />, label: t('calendar.next'), onClick: () => step(1) },
            {
              icon: <Icon name="grid" size={20} />,
              label: t('calendar.month'),
              className: mode === 'month' ? 'active' : '',
              onClick: () => setMode('month'),
            },
            {
              icon: <Icon name="list" size={20} />,
              label: t('calendar.week'),
              className: mode === 'week' ? 'active' : '',
              onClick: () => setMode('week'),
            },
          ]}
        />
      </div>
    </div>
  )
}

function DayCellView({
  cell,
  items,
  selected,
  addLabel,
  onSelect,
  onAddTask,
}: {
  cell: DayCell
  items: DayItems | undefined
  selected: boolean
  addLabel: string
  onSelect: () => void
  onAddTask?: (date: string) => void
}) {
  const { t } = useTranslation()
  const tasks = items?.tasks ?? []
  const focus = items?.focus ?? []
  const goals = items?.goals ?? []
  const focusMin = focus.reduce((sum, f) => sum + f.minutes, 0)
  const shownTasks = tasks.slice(0, 3)
  const extra = tasks.length - shownTasks.length

  return (
    <div
      className={`mg-cal-cell${cell.inMonth ? '' : ' out'}${cell.isToday ? ' today' : ''}${selected ? ' selected' : ''}`}
      onClick={onSelect}
    >
      <div className="mg-cal-cell-top">
        <span className="mg-cal-num">{cell.date.getDate()}</span>
        <button
          className="mg-cal-add"
          title={addLabel}
          aria-label={addLabel}
          onClick={(e) => {
            e.stopPropagation()
            if (onAddTask) onAddTask(cell.key)
            else onSelect()
          }}
        >
          <Icon name="plus" size={12} />
        </button>
      </div>
      <div className="mg-cal-chips">
        {shownTasks.map((task) => (
          <span
            key={task.id}
            className={`mg-cal-chip task${task.done ? ' done' : ''}`}
            style={{ ['--mg-c' as string]: PRIORITY_META[task.priority].color }}
            title={`${t('calendar.tasks')}: ${task.title}`}
          >
            {task.done && <Icon name="check" size={10} />}
            <span className="mg-cal-chip-txt">{task.title}</span>
          </span>
        ))}
        {extra > 0 && <span className="mg-cal-more">+{extra}</span>}
        {focusMin > 0 && (
          <span className="mg-cal-chip focus" title={t('calendar.focus')}>
            <Icon name="clock" size={10} /> {focusMin}m
          </span>
        )}
        {goals.map((g) => (
          <span
            key={g.id}
            className="mg-cal-chip goal"
            style={{ ['--mg-c' as string]: g.color }}
            title={g.title}
          >
            <Icon name="target" size={10} />
            <span className="mg-cal-chip-txt">{g.title}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default CalendarView
