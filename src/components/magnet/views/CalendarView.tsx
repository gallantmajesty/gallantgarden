import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import { PRIORITY_META, type Priority, type Task, type FocusSession, type Goal, type Recurrence, type LifeArea } from '../../../lib/magnet/types'
import { SectionHead, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'
import { useNow } from '../useNow'
import './CalendarView.css'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly']

interface EditState {
  id?: string
  title: string
  notes: string
  priority: Priority
  area: LifeArea
  due: string
  recurring: Recurrence
  estimateMin: number
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
  // Multi-select: task ids picked up with right-click / shift-click.
  const [sel, setSel] = useState<Set<string>>(new Set())
  // Right-click context menu on a day cell: Select all / Specific select /
  // Add tasks / More options — replaces the browser's default menu.
  const [ctx, setCtx] = useState<{ x: number; y: number; key: string } | null>(null)
  const [ctxSpecific, setCtxSpecific] = useState<string | null>(null)

  // Close the context menu on any outside click, another right-click, or Esc.
  useEffect(() => {
    if (!ctx) return
    const close = () => {
      setCtx(null)
      setCtxSpecific(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [ctx])

  function toggleSel(id: string) {
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function openCtx(e: React.MouseEvent, key: string) {
    e.preventDefault()
    e.stopPropagation()
    setCtxSpecific(null)
    setCtx({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 180),
      key,
    })
  }

  function ctxSelectAll(key: string) {
    const items = byDate.get(key)
    if (items && items.tasks.length > 0) {
      setSel((s) => {
        const n = new Set(s)
        for (const x of items.tasks) n.add(x.id)
        return n
      })
    }
    setCtx(null)
  }

  function openCreate(due: string) {
    setEdit({ title: '', notes: '', priority: 'medium', area: '', due, recurring: 'none', estimateMin: 0 })
  }
  function openEdit(task: Task) {
    setEdit({
      id: task.id,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      area: task.area,
      due: task.due ?? '',
      recurring: task.recurring,
      estimateMin: task.estimateMin || 0,
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
      area: edit.area,
      due: edit.due || null,
      recurring: edit.recurring,
      estimateMin: Math.max(0, Math.round(edit.estimateMin) || 0),
    }
    if (edit.id) updateTask(edit.id, payload)
    else addTask(payload)
    setEdit(null)
  }
  // Keep the legacy prop working (navigate away) if a caller still provides it.
  void onAddTask

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
  const multiMode = sel.size > 0

  // Bulk actions inside the day editor modal (scope: tasks due that day).
  function bulkDone(ids: string[]) {
    for (const id of ids) toggleTask(id)
    setSel(new Set())
  }
  function bulkDelete(ids: string[]) {
    for (const id of ids) deleteTask(id)
    setSel(new Set())
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
        {multiMode && (
          <span className="mg-cal-selbadge">
            <Icon name="check" size={12} /> {t('calendar.selectedCount', { n: sel.size })}
          </span>
        )}
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
            cap={mode === 'week' ? 7 : 6}
            selectedIds={sel}
            addLabel={t('calendar.addOnDate', { date: cell.key })}
            onSelect={() => setSelected(cell.key)}
            onAdd={() => openCreate(cell.key)}
            onEditTask={openEdit}
            onToggleDone={toggleTask}
            onToggleSel={toggleSel}
            onContext={(e) => openCtx(e, cell.key)}
          />
        ))}
      </div>

      {!hasAnyEvents && (
        <EmptyState icon="calendar" title={t('calendar.noEvents')} body={t('calendar.subtitle')} />
      )}

      {ctx && (
        <div
          className="mg-cal-ctx"
          style={{ left: ctx.x, top: ctx.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <button type="button" onClick={() => ctxSelectAll(ctx.key)}>
            <Icon name="grid" size={13} /> {t('calendar.selectAll')}
          </button>
          <button type="button" onClick={() => setCtxSpecific((d) => (d === ctx.key ? null : ctx.key))}>
            <Icon name="checkCircle" size={13} /> {t('calendar.specificSelect')}
          </button>
          {ctxSpecific === ctx.key && (
            <div className="mg-cal-ctx-sub">
              {(byDate.get(ctx.key)?.tasks ?? []).length === 0 ? (
                <span className="mg-cal-ctx-empty">{t('calendar.noEvents')}</span>
              ) : (
                (byDate.get(ctx.key)?.tasks ?? []).map((task) => (
                  <button
                    type="button"
                    key={task.id}
                    className={sel.has(task.id) ? 'on' : ''}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSel(task.id)
                    }}
                  >
                    <Icon name="check" size={11} />
                    <span className="mg-cal-ctx-task">{task.title}</span>
                  </button>
                ))
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setCtx(null)
              openCreate(ctx.key)
            }}
          >
            <Icon name="plus" size={13} /> {t('calendar.addTasks')}
          </button>
          <button
            type="button"
            onClick={() => {
              setCtx(null)
              setSelected(ctx.key)
            }}
          >
            <Icon name="chevron" size={13} /> {t('calendar.moreOptions')}
          </button>
        </div>
      )}

      {/* ═══ Day editor — a modal instead of a bar under the grid ═══ */}
      <MgModal
        open={!!selected}
        title={
          selected
            ? new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(
                new Date(selected + 'T00:00:00'),
              )
            : ''
        }
        onClose={() => setSelected(null)}
        width={640}
      >
        <div className="mg-cal-day">
          {(() => {
            const dayTasks = selectedItems?.tasks ?? []
            const selInDay = dayTasks.filter((x) => sel.has(x.id))
            return (
              <>
                <div className="mg-cal-day-headrow">
                  <button className="mg-btn small" onClick={() => selected && openCreate(selected)}>
                    <Icon name="plus" size={14} /> {t('calendar.addTask')}
                  </button>
                  {selInDay.length > 1 && (
                    <div className="mg-cal-bulk">
                      <span className="mg-muted">{t('calendar.selectedCount', { n: selInDay.length })}</span>
                      <button
                        className="mg-btn small"
                        onClick={() => bulkDone(selInDay.map((x) => x.id))}
                        title={t('calendar.doneSelected')}
                      >
                        <Icon name="check" size={13} />
                      </button>
                      <button
                        className="mg-btn small danger"
                        onClick={() => bulkDelete(selInDay.map((x) => x.id))}
                        title={t('calendar.deleteSelected')}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {selectedItems &&
                (selectedItems.tasks.length || selectedItems.focus.length || selectedItems.goals.length) ? (
                  <div className="mg-cal-day-lists">
                    {selectedItems.tasks.length > 0 && (
                      <ul className="mg-cal-list">
                        {selectedItems.tasks.map((task) => (
                          <li
                            key={task.id}
                            style={{ ['--mg-c' as string]: PRIORITY_META[task.priority].color }}
                            className={sel.has(task.id) ? 'sel' : ''}
                          >
                            <button
                              className={`mg-cal-task ${task.done ? 'done' : ''}`}
                              onClick={() => toggleTask(task.id)}
                              title={task.done ? t('calendar.undone') : t('calendar.done')}
                            >
                              <span className="mg-cal-dot" />
                              <span className={task.done ? 'mg-cal-done' : ''}>{task.title}</span>
                              {task.done && <Icon name="check" size={13} />}
                            </button>
                            <button
                              className="mg-cal-task-edit"
                              onClick={() => openEdit(task)}
                              aria-label={t('tasks.editTask')}
                            >
                              <Icon name="edit" size={13} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedItems.focus.map((f) => (
                      <div key={f.id} className="mg-cal-focus">
                        <Icon name="clock" size={14} /> {f.minutes}m
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
              </>
            )
          })()}
        </div>
      </MgModal>

      {/* ═══ Task editor — with an advanced section (repeats + estimate) ═══ */}
      <MgModal
        open={!!edit}
        title={edit?.id ? t('tasks.editTask') : t('tasks.newTask')}
        onClose={() => setEdit(null)}
        width={520}
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
              <input
                value={edit?.area ?? ''}
                onChange={(e) => edit && setEdit({ ...edit, area: e.target.value })}
                placeholder={t('tasks.areaPlaceholder')}
              />
            </Field>
          </div>
          <div className="mg-form-row">
            <Field label={t('tasks.dueDateLabel')}>
              <input
                type="date"
                value={edit?.due ?? ''}
                onChange={(e) => edit && setEdit({ ...edit, due: e.target.value })}
              />
            </Field>
            <Field label={t('calendar.recurringLabel')}>
              <select
                value={edit?.recurring ?? 'none'}
                onChange={(e) => edit && setEdit({ ...edit, recurring: e.target.value as Recurrence })}
              >
                {RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {t(`calendar.repeat${r[0].toUpperCase()}${r.slice(1)}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mg-form-row">
            <Field label={t('calendar.estimateLabel')}>
              <input
                type="number"
                min={0}
                step={1}
                value={edit?.estimateMin ?? 0}
                onChange={(e) => edit && setEdit({ ...edit, estimateMin: Number(e.target.value) })}
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
  selectedIds,
  addLabel,
  onSelect,
  onAdd,
  onEditTask,
  onToggleDone,
  onToggleSel,
  onContext,
}: {
  cell: DayCell
  items: DayItems | undefined
  selected: boolean
  cap: number
  selectedIds: Set<string>
  addLabel: string
  onSelect: () => void
  onAdd: (date: string) => void
  onEditTask: (task: Task) => void
  onToggleDone: (id: string) => void
  onToggleSel: (id: string) => void
  onContext: (e: React.MouseEvent) => void
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
      className={`mg-cal-cell${cell.inMonth ? '' : ' out'}${cell.isToday ? ' today' : ''}${selected ? ' selected' : ''}`}
      onClick={onSelect}
      onContextMenu={onContext}
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
            className={`mg-cal-chip task${task.done ? ' done' : ''}${selectedIds.has(task.id) ? ' sel' : ''}`}
            style={{ ['--mg-c' as string]: PRIORITY_META[task.priority].color }}
            onClick={(e) => {
              if (e.shiftKey) {
                e.stopPropagation()
                onToggleSel(task.id)
                return
              }
              e.stopPropagation()
              onEditTask(task)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleSel(task.id)
            }}
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
            <span className={`mg-cal-chip-txt${task.done ? ' done' : ''}`}>
              {task.title}
              {task.recurring !== 'none' && <Icon name="spark" size={9} />}
              {task.subtasks.length > 0 && (
                <em className="mg-cal-chip-sub">
                  {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                </em>
              )}
              {task.estimateMin > 0 && <em className="mg-cal-chip-est">{task.estimateMin}m</em>}
            </span>
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