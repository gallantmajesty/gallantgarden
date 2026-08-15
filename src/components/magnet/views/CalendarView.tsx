import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import { AREA_META, PRIORITY_META, type LifeArea, type Priority, type Task, type FocusSession, type Goal } from '../../../lib/magnet/types'
import { SectionHead, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'
import { useNow } from '../useNow'
import './CalendarView.css'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const AREAS: LifeArea[] = ['academic', 'personal', 'health', 'career', 'creative', 'social']

interface EditState {
  id?: string
  title: string
  notes: string
  priority: Priority
  subject: string
  area: LifeArea
  due: string
}

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
  const addTask = useMagnet((s) => s.addTask)
  const updateTask = useMagnet((s) => s.updateTask)
  const toggleTask = useMagnet((s) => s.toggleTask)
  const deleteTask = useMagnet((s) => s.deleteTask)

  const [mode, setMode] = useState<Mode>('month')
  const [cursor, setCursor] = useState<Date>(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  // Drag-and-drop: which task is being dragged, and which day it's hovering over.
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  function openCreate(due: string) {
    setEdit({ title: '', notes: '', priority: 'medium', subject: '', area: 'academic', due })
  }
  function openEdit(task: Task) {
    setEdit({
      id: task.id,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      subject: task.subject,
      area: task.area,
      due: task.due ?? '',
    })
  }
  function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!edit) return
    const title = edit.title.trim()
    if (!title) return
    const payload = {
      title,
      notes: edit.notes.trim(),
      priority: edit.priority,
      subject: edit.subject.trim(),
      area: edit.area,
      due: edit.due || null,
    }
    if (edit.id) updateTask(edit.id, payload)
    else addTask(payload)
    setEdit(null)
  }
  // Keep the legacy prop working (navigate away) if a caller still provides it.
  const legacyAdd = onAddTask ?? undefined

  const todayKey = iso(useNow())
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

  // Roll-up stats for the visible period (month = current month only).
  const stats = useMemo(() => {
    const keys = mode === 'week' ? cells.map((c) => c.key) : cells.filter((c) => c.inMonth).map((c) => c.key)
    let tasks = 0
    let done = 0
    let focusMin = 0
    let goals = 0
    for (const k of keys) {
      const items = byDate.get(k)
      if (!items) continue
      tasks += items.tasks.length
      done += items.tasks.filter((x) => x.done).length
      focusMin += items.focus.reduce((s, f) => s + f.minutes, 0)
      goals += items.goals.length
    }
    return { tasks, done, focusMin, goals }
  }, [mode, cells, byDate])

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

  // Move a dragged task to the hovered day.
  function moveTaskTo(id: string, due: string) {
    if (!id || !due) return
    updateTask(id, { due })
  }

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

      {/* Live roll-up for the visible period */}
      <div className="mg-cal-stats">
        <span className="mg-cal-stat">
          <Icon name="calendar" size={13} />
          <b>{stats.tasks}</b> {t('calendar.due')}
        </span>
        <span className="mg-cal-stat ok">
          <Icon name="check" size={13} />
          <b>{stats.done}</b> {t('calendar.done')}
        </span>
        <span className="mg-cal-stat">
          <Icon name="clock" size={13} />
          <b>{stats.focusMin}m</b> {t('calendar.focus')}
        </span>
        <span className="mg-cal-stat">
          <Icon name="target" size={13} />
          <b>{stats.goals}</b> {t('calendar.goals')}
        </span>
        <span className="mg-cal-dragtip" title={t('calendar.moveTask')}>
          <Icon name="grip" size={12} /> {t('calendar.moveTask')}
        </span>
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
            cap={mode === 'week' ? 7 : 3}
            dragOver={dragOver === cell.key}
            addLabel={t('calendar.addOnDate', { date: cell.key })}
            moveLabel={t('calendar.moveTask')}
            onSelect={() => setSelected(cell.key)}
            onAdd={() => openCreate(cell.key)}
            onEditTask={openEdit}
            onToggleDone={toggleTask}
            onDragStart={(id) => {
              dragId.current = id
            }}
            onDragEnd={() => {
              dragId.current = null
              setDragOver(null)
            }}
            onDragOver={() => setDragOver(cell.key)}
            onDragLeave={() => setDragOver((k) => (k === cell.key ? null : k))}
            onDrop={() => {
              const id = dragId.current
              dragId.current = null
              setDragOver(null)
              if (id) moveTaskTo(id, cell.key)
            }}
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
            <button className="mg-btn small" onClick={() => openCreate(selected)}>
              <Icon name="plus" size={14} /> {t('calendar.addTask')}
            </button>
          </div>
          {selectedItems && (selectedItems.tasks.length || selectedItems.focus.length || selectedItems.goals.length) ? (
            <div className="mg-cal-day-lists">
              {selectedItems.tasks.length > 0 && (
                <ul className="mg-cal-list">
                  {selectedItems.tasks.map((task) => (
                    <li key={task.id} style={{ ['--mg-c' as string]: PRIORITY_META[task.priority].color }}>
                      <button
                        className={`mg-cal-task ${task.done ? 'done' : ''}`}
                        onClick={() => toggleTask(task.id)}
                        title={task.done ? t('calendar.undone') : t('calendar.done')}
                      >
                        <span className="mg-cal-dot" />
                        <span className={task.done ? 'mg-cal-done' : ''}>{task.title}</span>
                        {task.done && <Icon name="check" size={13} />}
                      </button>
                      <button className="mg-cal-task-edit" onClick={() => openEdit(task)} aria-label={t('tasks.editTask')}>
                        <Icon name="edit" size={13} />
                      </button>
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

      {/* Inline task editor — add & edit tasks right in the calendar */}
      <MgModal
        open={!!edit}
        title={edit?.id ? t('tasks.editTask') : t('tasks.newTask')}
        onClose={() => setEdit(null)}
        width={500}
      >
        <form className="mg-form" onSubmit={saveEdit}>
          <Field label={t('tasks.titleLabel')}>
            <input
              autoFocus
              value={edit?.title ?? ''}
              onChange={(e) => edit && setEdit({ ...edit, title: e.target.value })}
              placeholder={t('tasks.titlePlaceholder')}
            />
          </Field>
          <Field label={t('tasks.notesLabel')}>
            <textarea
              rows={2}
              value={edit?.notes ?? ''}
              onChange={(e) => edit && setEdit({ ...edit, notes: e.target.value })}
              placeholder={t('tasks.notesPlaceholder')}
            />
          </Field>
          <div className="mg-form-row">
            <Field label={t('tasks.priorityLabel')}>
              <select
                value={edit?.priority ?? 'medium'}
                onChange={(e) => edit && setEdit({ ...edit, priority: e.target.value as Priority })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('tasks.areaLabel')}>
              <select
                value={edit?.area ?? 'academic'}
                onChange={(e) => edit && setEdit({ ...edit, area: e.target.value as LifeArea })}
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {AREA_META[a].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mg-form-row">
            <Field label={t('tasks.subjectLabel')}>
              <input
                value={edit?.subject ?? ''}
                onChange={(e) => edit && setEdit({ ...edit, subject: e.target.value })}
                placeholder={t('tasks.subjectPlaceholder')}
              />
            </Field>
            <Field label={t('tasks.dueDateLabel')}>
              <input
                type="date"
                value={edit?.due ?? ''}
                onChange={(e) => edit && setEdit({ ...edit, due: e.target.value })}
              />
            </Field>
          </div>
          <div className="mg-form-actions">
            {edit?.id && (
              <button
                type="button"
                className="mg-btn glass danger"
                onClick={() => {
                  if (edit.id) deleteTask(edit.id)
                  setEdit(null)
                }}
              >
                <Icon name="trash" size={14} /> {t('common.delete')}
              </button>
            )}
            <button type="button" className="mg-btn glass" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              {edit?.id ? t('tasks.saveChanges') : t('tasks.addTask')}
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}

function DayCellView({
  cell,
  items,
  selected,
  cap,
  dragOver,
  addLabel,
  moveLabel,
  onSelect,
  onAdd,
  onEditTask,
  onToggleDone,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  cell: DayCell
  items: DayItems | undefined
  selected: boolean
  cap: number
  dragOver: boolean
  addLabel: string
  moveLabel: string
  onSelect: () => void
  onAdd: (date: string) => void
  onEditTask: (task: Task) => void
  onToggleDone: (id: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: () => void
}) {
  const { t } = useTranslation()
  const tasks = items?.tasks ?? []
  const focus = items?.focus ?? []
  const goals = items?.goals ?? []
  const focusMin = focus.reduce((sum, f) => sum + f.minutes, 0)
  const shownTasks = tasks.slice(0, cap)
  const extra = tasks.length - shownTasks.length

  return (
    <div
      className={`mg-cal-cell${cell.inMonth ? '' : ' out'}${cell.isToday ? ' today' : ''}${selected ? ' selected' : ''}${
        dragOver ? ' drag-over' : ''
      }`}
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver()
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
    >
      <div className="mg-cal-cell-top">
        <span className="mg-cal-num">{cell.date.getDate()}</span>
        <button
          className="mg-cal-add"
          title={addLabel}
          aria-label={addLabel}
          onClick={(e) => {
            e.stopPropagation()
            onAdd(cell.key)
          }}
        >
          <Icon name="plus" size={12} />
        </button>
      </div>
      <div className="mg-cal-chips">
        {shownTasks.map((task) => (
          <div
            key={task.id}
            className={`mg-cal-chip task${task.done ? ' done' : ''}`}
            style={{ ['--mg-c' as string]: PRIORITY_META[task.priority].color }}
            title={moveLabel}
            draggable
            onClick={(e) => {
              e.stopPropagation()
              onEditTask(task)
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', task.id)
              e.dataTransfer.effectAllowed = 'move'
              onDragStart(task.id)
            }}
            onDragEnd={onDragEnd}
          >
            <button
              className="mg-cal-chip-done"
              title={task.done ? t('calendar.undone') : t('calendar.done')}
              aria-label={task.done ? t('calendar.undone') : t('calendar.done')}
              onClick={(e) => {
                e.stopPropagation()
                onToggleDone(task.id)
              }}
            >
              {task.done ? <Icon name="check" size={10} /> : <span className="mg-cal-ring" />}
            </button>
            <span className={`mg-cal-chip-txt${task.done ? ' done' : ''}`}>{task.title}</span>
          </div>
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
