import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import {
  getAreaMeta,
  PRIORITY_META,
  type LifeArea,
  type Priority,
  type Recurrence,
  type Task,
  type Goal,
} from '../../../lib/magnet/types'
import { SectionHead, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'
import { useNow } from '../useNow'
import { dayKey } from '../../../lib/magnet/insights'

type StatusFilter = 'open' | 'done' | 'all' | 'overdue'
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly']
const TASK_ICONS = ['check', 'book', 'brain', 'rocket', 'star', 'flag', 'bulb', 'heart', 'fire', 'pin']

// Kind icon for finished goals & dreams shown in the history log.
const GOAL_KIND_ICONS: Record<Goal['kind'], string> = {
  short: 'flag',
  long: 'target',
  life: 'star',
  dream: 'rocket',
}

type DueTone = 'overdue' | 'today' | 'tomorrow' | 'upcoming'

/** Relative position of a "YYYY-MM-DD" due date vs today (negative = overdue). */
function dueTone(due: string, today: string): { tone: DueTone; days: number } {
  const parse = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  const diff = Math.round((parse(due) - parse(today)) / 86400000)
  if (diff < 0) return { tone: 'overdue', days: -diff }
  if (diff === 0) return { tone: 'today', days: 0 }
  if (diff === 1) return { tone: 'tomorrow', days: 1 }
  return { tone: 'upcoming', days: diff }
}

function shortDate(due: string): string {
  return new Date(due + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Draft {
  title: string
  notes: string
  priority: Priority
  area: LifeArea
  due: string
  estimateMin: number
  recurring: Recurrence
  icon: string
}

function emptyDraft(): Draft {
  return {
    title: '',
    notes: '',
    priority: 'medium',
    area: '',
    due: '',
    estimateMin: 0,
    recurring: 'none',
    icon: 'check',
  }
}

export function TasksView({
  prefillDue = null,
  onPrefillDue,
}: {
  prefillDue?: string | null
  onPrefillDue?: () => void
}) {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const addTask = useMagnet((s) => s.addTask)
  const updateTask = useMagnet((s) => s.updateTask)
  const toggleTask = useMagnet((s) => s.toggleTask)
  const deleteTask = useMagnet((s) => s.deleteTask)
  const addSubtask = useMagnet((s) => s.addSubtask)
  const toggleSubtask = useMagnet((s) => s.toggleSubtask)
  const removeSubtask = useMagnet((s) => s.removeSubtask)
  const addTemplate = useMagnet((s) => s.addTemplate)
  const deleteTemplate = useMagnet((s) => s.deleteTemplate)
  const createFromTemplate = useMagnet((s) => s.createFromTemplate)

  const [status, setStatus] = useState<StatusFilter>('open')
  const [area, setArea] = useState<LifeArea | 'all'>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [quick, setQuick] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [subInput, setSubInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [tplDraft, setTplDraft] = useState({
    title: '',
    notes: '',
    priority: 'medium' as Priority,
    area: '' as LifeArea,
    icon: 'check',
    addToTasks: true,
  })

  const [doneAnim, setDoneAnim] = useState<string | null>(null)
  const now = useNow()
  const today = dayKey(now)
  const quickRef = useRef<HTMLInputElement | null>(null)

  // When the calendar (or another view) asks to create a task on a specific date.
  useEffect(() => {
    if (prefillDue) {
      startCreate(prefillDue)
      onPrefillDue?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDue])

  // Press "/" anywhere (unless typing) to jump straight into quick capture.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      e.preventDefault()
      quickRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const baseList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.tasks
      .filter((tk) => {
        if (status === 'all') return true
        if (status === 'done') return tk.done
        if (status === 'overdue') return !tk.done && !!tk.due && tk.due < today
        return !tk.done
      })
      .filter((tk) => (area === 'all' ? true : tk.area === area))
      .filter((tk) =>
        q ? tk.title.toLowerCase().includes(q) || tk.notes.toLowerCase().includes(q) : true,
      )
  }, [data.tasks, status, area, search, today])

  // Smart sort: overdue open tasks first, then open tasks by priority weight,
  // then by due date. Completed tasks (history) are sorted newest-completed first.
  const filtered = useMemo(() => {
    if (status === 'done') {
      return [...baseList].sort((a, b) => {
        const da = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const db = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return db - da
      })
    }
    return [...baseList].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const ao = !!a.due && a.due < today
      const bo = !!b.due && b.due < today
      if (ao !== bo) return ao ? -1 : 1
      const w = PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight
      if (w !== 0) return w
      return (a.due ?? '9999').localeCompare(b.due ?? '9999')
    })
  }, [baseList, status, today])

  const openCount = data.tasks.filter((tk) => !tk.done).length
  const doneCount = data.tasks.length - openCount
  const overdueCount = data.tasks.filter((tk) => !tk.done && !!tk.due && tk.due < today).length

  // Completed goals & dreams — shown in the history alongside done tasks.
  const doneGoals = useMemo(
    () =>
      data.goals
        .filter((g) => g.progress >= 100)
        .sort((a, b) => {
          const da = new Date(a.createdAt).getTime() || 0
          const db = new Date(b.createdAt).getTime() || 0
          return db - da
        }),
    [data.goals],
  )

  // Smart sections for the open queue: Overdue → Today → Tomorrow → Upcoming → No date.
  // Flat list whenever searching or browsing done/all.
  const groups = useMemo(() => {
    if (status !== 'open' || search.trim()) return null
    const ov: Task[] = []
    const td: Task[] = []
    const tm: Task[] = []
    const up: Task[] = []
    const nd: Task[] = []
    for (const tk of filtered) {
      if (!tk.due) nd.push(tk)
      else {
        const tone = dueTone(tk.due, today).tone
        if (tone === 'overdue') ov.push(tk)
        else if (tone === 'today') td.push(tk)
        else if (tone === 'tomorrow') tm.push(tk)
        else up.push(tk)
      }
    }
    const mk = (key: string, labelKey: string, icon: string, tone: string, tasks: Task[]) =>
      tasks.length ? { key, labelKey, icon, tone, tasks } : null
    return (
      [
        mk('overdue', 'tasks.groupOverdue', 'fire', '#ff5d6c', ov),
        mk('today', 'tasks.groupToday', 'sun', 'var(--mg-accent)', td),
        mk('tomorrow', 'tasks.groupTomorrow', 'clock', 'var(--mg-text-soft)', tm),
        mk('upcoming', 'tasks.groupUpcoming', 'calendar', 'var(--mg-text-soft)', up),
        mk('nodate', 'tasks.groupNoDate', 'flag', 'var(--mg-text-soft)', nd),
      ].filter(Boolean) as { key: string; labelKey: string; icon: string; tone: string; tasks: Task[] }[]
    )
  }, [filtered, status, search, today])

  // Distinct life areas currently in use — powers the free-form filter chips.
  const existingAreas = useMemo(
    () => [...new Set(data.tasks.map((tk) => tk.area).filter(Boolean))].sort(),
    [data.tasks],
  )

  // Is an open task past its due date?
  const isOverdueTask = (task: Task) => !task.done && !!task.due && dueTone(task.due, today).tone === 'overdue'

  // One task card: check, title, meta row, expandable detail, progress rail.
  const taskRow = (task: Task) => {
    const a = getAreaMeta(task.area)
    const subsDone = task.subtasks.filter((s) => s.done).length
    const isOpen = expanded === task.id
    const due = task.due ? dueTone(task.due, today) : null
    const dueLabel = task.due
      ? due?.tone === 'overdue'
        ? t('tasks.daysOverdue', { n: due.days })
        : due?.tone === 'today'
          ? t('tasks.dueToday')
          : due?.tone === 'tomorrow'
            ? t('tasks.dueTomorrow')
            : shortDate(task.due)
      : ''
    return (
      <>
        <div className="mg-taskcard-top">
          <button
            className="mg-check"
            onClick={() => onCheck(task)}
            aria-label="Complete"
            style={{ ['--mg-check-tone' as string]: PRIORITY_META[task.priority].color }}
          >
            <Icon name="check" size={14} />
          </button>
          <button className="mg-taskcard-body" onClick={() => setExpanded(isOpen ? null : task.id)}>
            <span className="mg-task-icon" style={{ color: PRIORITY_META[task.priority].color }}>
              <Icon name={task.icon} size={16} />
            </span>
            <span className="mg-task-text">
              <span className="mg-task-title">{task.title}</span>
              <span className="mg-task-meta">
                <span className="mg-tag" style={{ ['--mg-tag' as string]: a.color }}>
                  {a.label}
                </span>
                <span className="mg-tag soft" style={{ ['--mg-tag' as string]: PRIORITY_META[task.priority].color }}>
                  {PRIORITY_META[task.priority].label}
                </span>
                {task.due ? (
                  <span className={`mg-task-due ${due?.tone ?? ''}`} title={task.due}>
                    <Icon name="calendar" size={12} /> {dueLabel}
                  </span>
                ) : !task.done ? (
                  <button
                    className="mg-task-due set-today"
                    onClick={() => updateTask(task.id, { due: today })}
                    title={t('tasks.setDueToday')}
                  >
                    <Icon name="calendar" size={12} /> {t('tasks.setDueToday')}
                  </button>
                ) : null}
                {task.estimateMin > 0 && (
                  <span className="mg-task-est">
                    <Icon name="clock" size={12} /> {task.estimateMin}m
                  </span>
                )}
                {task.recurring !== 'none' && (
                  <span className="mg-task-rec">
                    <Icon name="spark" size={12} /> {task.recurring}
                  </span>
                )}
                {task.subtasks.length > 0 && (
                  <span className="mg-task-subcount">
                    {subsDone}/{task.subtasks.length}
                  </span>
                )}
              </span>
            </span>
          </button>
          <div className="mg-taskcard-actions">
            <button className="mg-iconbtn" onClick={() => startEdit(task)} aria-label="Edit" title="Edit">
              <Icon name="edit" size={15} />
            </button>
            <button className="mg-iconbtn danger" onClick={() => deleteTask(task.id)} aria-label="Delete" title="Delete">
              <Icon name="trash" size={15} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="mg-taskcard-detail">
            {task.notes && <p className="mg-task-notes">{task.notes}</p>}

            <ul className="mg-sublist">
              {task.subtasks.map((s) => (
                <li key={s.id}>
                  <button
                    className={`mg-subcheck ${s.done ? 'done' : ''}`}
                    onClick={() => {
                      toggleSubtask(task.id, s.id)
                    }}
                  >
                    <Icon name="check" size={11} />
                  </button>
                  <span className={s.done ? 'done' : ''}>{s.title}</span>
                  <button className="mg-iconbtn danger" onClick={() => removeSubtask(task.id, s.id)}>
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mg-subadd"
              onSubmit={(e) => {
                e.preventDefault()
                const v = subInput.trim()
                if (!v) return
                addSubtask(task.id, v)
                setSubInput('')
              }}
            >
              <input
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                placeholder={t('tasks.addSubtaskPlaceholder')}
              />
              <button type="submit">
                <Icon name="plus" size={14} />
              </button>
            </form>
          </div>
        )}

        {task.subtasks.length > 0 && (
          <div className="mg-task-progress" title={`${subsDone}/${task.subtasks.length}`}>
            <i style={{ width: `${Math.round((subsDone / task.subtasks.length) * 100)}%` }} />
          </div>
        )}
      </>
    )
  }

  function quickAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    addTask({ title, due: prefillDue ?? null })
    setQuick('')
  }

  function clearDone() {
    for (const tk of data.tasks) if (tk.done) deleteTask(tk.id)
  }

  function startCreate(due?: string) {
    setEditId(null)
    setDraft({ ...emptyDraft(), due: due ?? '' })
    setModalOpen(true)
  }
  function startEdit(tk: Task) {
    setEditId(tk.id)
    setDraft({
      title: tk.title,
      notes: tk.notes,
      priority: tk.priority,
      area: tk.area,
      due: tk.due ?? '',
      estimateMin: tk.estimateMin,
      recurring: tk.recurring,
      icon: tk.icon,
    })
    setModalOpen(true)
  }
  function save(e: React.FormEvent) {
    e.preventDefault()
    const title = draft.title.trim()
    if (!title) return
    const payload = {
      title,
      notes: draft.notes.trim(),
      priority: draft.priority,
      area: draft.area,
      due: draft.due || null,
      estimateMin: Number(draft.estimateMin) || 0,
      recurring: draft.recurring,
      icon: draft.icon,
    }
    if (editId) updateTask(editId, payload)
    else addTask(payload)
    setModalOpen(false)
  }

  function onCheck(tk: Task) {
    if (!tk.done) {
      setDoneAnim(tk.id)
      setTimeout(() => setDoneAnim((cur) => (cur === tk.id ? null : cur)), 850)
    }
    toggleTask(tk.id)
  }

  function saveTemplate(e: React.FormEvent) {
    e.preventDefault()
    const title = tplDraft.title.trim()
    if (!title) return
    addTemplate({
      title,
      notes: tplDraft.notes.trim(),
      priority: tplDraft.priority,
      area: tplDraft.area,
      icon: tplDraft.icon,
      addToTasks: tplDraft.addToTasks,
    })
    setTplOpen(false)
    setTplDraft({ title: '', notes: '', priority: 'medium', area: '', icon: 'check', addToTasks: true })
  }

  return (
    <div className="mg-view">
      <SectionHead
        icon="check"
        title={t('tasks.title')}
        subtitle={`${openCount} ${t('tasks.openCount')}${overdueCount > 0 ? ` · ${overdueCount} ${t('tasks.overdue')}` : ''} · ${data.tasks.length} ${t('tasks.totalCount')}`}
        action={
          <div className="mg-view-actions">
            {doneCount > 0 && (
              <button className="mg-btn glass small" onClick={clearDone} title={t('tasks.clearDone')}>
                <Icon name="trash" size={15} /> {t('tasks.clearDone')}
              </button>
            )}
            <button className="mg-btn primary" onClick={() => startCreate()}>
              <Icon name="plus" size={16} /> {t('tasks.newTask')}
            </button>
          </div>
        }
      />

      {/* Notion-style quick capture — type and press Enter to create. */}
      <form className="mg-quickcapture" onSubmit={quickAdd}>
        <Icon name="plus" size={18} />
        <input
          ref={quickRef}
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder={t('tasks.quickPlaceholder')}
        />
        <span className="mg-kbd">/</span>
        <button type="submit" className="mg-btn primary small" disabled={!quick.trim()}>
          {t('tasks.add')}
        </button>
      </form>

      {/* Templates (Notion-style) */}
      {data.templates.length > 0 && (
        <div className="mg-tpl-strip">
          <span className="mg-tpl-label">
            <Icon name="bulb" size={14} /> {t('tasks.templates')}
          </span>
          {data.templates.map((tpl) => (
            <span key={tpl.id} className="mg-tpl-chip" style={{ ['--mg-tag' as string]: PRIORITY_META[tpl.priority].color }}>
              <Icon name={tpl.icon} size={13} />
              {tpl.title}
              <button className="mg-tpl-use" onClick={() => createFromTemplate(tpl.id)}>
                {t('tasks.useTemplate')}
              </button>
              <button className="mg-tpl-del" onClick={() => deleteTemplate(tpl.id)} aria-label={t('tasks.deleteTemplate')}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
          <button className="mg-tpl-add" onClick={() => setTplOpen(true)}>
            <Icon name="plus" size={13} /> {t('tasks.newTemplate')}
          </button>
        </div>
      )}

      {/* Filter bar — status with counts + area chips + search. */}
      <div className="mg-filterbar">
        <div className="mg-seg">
          {(['open', 'done', 'all', 'overdue'] as StatusFilter[])
            .filter((s) => s !== 'overdue' || overdueCount > 0)
            .map((s) => (
              <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
                {s === 'open' ? t('tasks.filter_open') : s === 'done' ? t('tasks.filter_done') : s === 'overdue' ? t('tasks.filter_overdue') : t('tasks.filter_all')}
                <span className="mg-seg-count">
                  {s === 'open' ? openCount : s === 'done' ? doneCount : s === 'overdue' ? overdueCount : data.tasks.length}
                </span>
              </button>
            ))}
        </div>
        <div className="mg-chipscroll" role="tablist" aria-label={t('tasks.filterByArea')}>
          {(['all', ...existingAreas] as (LifeArea | 'all')[]).map((a) => {
            const active = area === a
            const count = data.tasks.filter(
              (tk) =>
                (a === 'all' || tk.area === a) &&
                (status === 'done' ? tk.done : status === 'overdue' ? false : !tk.done),
            ).length
            return (
              <button
                key={a}
                className={`mg-fchip ${active ? 'active' : ''}`}
                style={a !== 'all' ? { ['--mg-tag' as string]: getAreaMeta(a).color } : undefined}
                onClick={() => setArea(a)}
              >
                <Icon name={a === 'all' ? 'grid' : getAreaMeta(a).icon} size={13} />
                {a === 'all' ? t('tasks.allAreas') : getAreaMeta(a).label}
                <span className="mg-fchip-count">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="mg-search">
          <Icon name="target" size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('tasks.searchPlaceholder')} />
          {search && (
            <button className="mg-search-clear" onClick={() => setSearch('')} aria-label={t('tasks.clearSearch')}>
              <Icon name="close" size={13} />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="check"
          title={t('tasks.noTasksTitle')}
          body={data.tasks.length === 0 ? t('tasks.noTasksBody') : t('tasks.noTasksMatch')}
          action={
            data.tasks.length === 0 ? (
              <button className="mg-btn primary" onClick={() => startCreate()}>
                <Icon name="plus" size={16} /> {t('tasks.newTask')}
              </button>
            ) : (
              <button
                className="mg-btn glass"
                onClick={() => {
                  setStatus('all')
                  setArea('all')
                  setSearch('')
                }}
              >
                {t('tasks.clearFilters')}
              </button>
            )
          }
        />
      ) : (
        <ul className="mg-tasklist">
          {(groups ? groups.flatMap((g) => [
            <li key={g.key} className="mg-tgroup-head" style={{ ['--mg-tone' as string]: g.tone }}>
              <span className="mg-tgroup-ico">
                <Icon name={g.icon} size={14} />
              </span>
              <span className="mg-tgroup-label">{t(g.labelKey)}</span>
              <span className="mg-tgroup-count">{g.tasks.length}</span>
              <span className="mg-tgroup-line" />
            </li>,
            ...g.tasks.map((task, index) => (
              <li
                key={task.id}
                className={`mg-taskcard ${task.done ? 'done' : ''} ${
                  isOverdueTask(task) ? 'overdue' : ''
                } ${doneAnim === task.id ? 'mg-burst' : ''}`}
                style={{
                  ['--mg-prio' as string]: PRIORITY_META[task.priority].color,
                  animationDelay: `${Math.min(index, 8) * 30}ms`,
                }}
              >
                {taskRow(task)}
              </li>
            )),
          ]) : filtered.map((task, index) => (
              <li
                key={task.id}
                className={`mg-taskcard ${task.done ? 'done' : ''} ${
                  isOverdueTask(task) ? 'overdue' : ''
                } ${doneAnim === task.id ? 'mg-burst' : ''}`}
                style={{
                  ['--mg-prio' as string]: PRIORITY_META[task.priority].color,
                  animationDelay: `${Math.min(index, 8) * 30}ms`,
                }}
              >
                {taskRow(task)}
              </li>
            )))}
        </ul>
      )}

      {/* History — completed tasks, finished goals & dreams, newest first. */}
      {(doneCount > 0 || doneGoals.length > 0) && status !== 'done' && (
        <div className="mg-history">
          <button className="mg-history-head" onClick={() => setHistoryOpen((o) => !o)}>
            <span style={{ display: 'inline-flex', transform: historyOpen ? 'rotate(90deg)' : 'none' }}><Icon name="chevron" size={16} /></span>
            <Icon name="clock" size={15} />
            {t('tasks.history')}
            <span className="mg-history-count">{doneCount + doneGoals.length}</span>
          </button>
          {historyOpen && (
            <ul className="mg-history-list">
              {[...data.tasks]
                .filter((tk) => tk.done)
                .sort((a, b) => {
                  const da = a.completedAt ? new Date(a.completedAt).getTime() : 0
                  const db = b.completedAt ? new Date(b.completedAt).getTime() : 0
                  return db - da
                })
                .map((tk) => (
                  <li key={tk.id}>
                    <Icon name="check" size={13} />
                    <span className="mg-history-title">{tk.title}</span>
                    {tk.completedAt && (
                      <span className="mg-history-date">
                        {new Date(tk.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <button
                      className="mg-history-restore"
                      onClick={() => toggleTask(tk.id)}
                      title={t('tasks.restore')}
                      aria-label={t('tasks.restore')}
                    >
                      <Icon name="restore" size={13} />
                    </button>
                  </li>
                ))}
              {doneGoals.map((g) => (
                <li key={`goal-${g.id}`} className="mg-history-goal">
                  <Icon name={GOAL_KIND_ICONS[g.kind]} size={13} />
                  <span className="mg-history-title">{g.title}</span>
                  <span className="mg-history-kind">
                    {g.kind === 'short'
                      ? t('goals.kindShort')
                      : g.kind === 'long'
                        ? t('goals.kindLong')
                        : g.kind === 'life'
                          ? t('goals.kindLife')
                          : t('goals.kindDream')}
                  </span>
                  <span className="mg-history-date">
                    {g.progress >= 100 ? '100%' : new Date(g.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <MgModal open={modalOpen} title={editId ? t('tasks.editTask') : t('tasks.newTask')} onClose={() => setModalOpen(false)} width={520}>
        <form className="mg-form" onSubmit={save}>
          <Field label={t('tasks.titleLabel')}>
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder={t('tasks.titlePlaceholder')}
            />
          </Field>
          <Field label={t('tasks.notesLabel')}>
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder={t('tasks.notesPlaceholder')}
            />
          </Field>

          <div className="mg-form-row">
            <Field label={t('tasks.priorityLabel')}>
              <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('tasks.areaLabel')}>
              <input
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                placeholder={t('tasks.areaPlaceholder')}
              />
            </Field>
          </div>

          <div className="mg-form-row">
            <Field label={t('tasks.dueDateLabel')}>
              <input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
            </Field>
          </div>

          <div className="mg-form-row">
            <Field label={t('tasks.estimateLabel')}>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.estimateMin || ''}
                onChange={(e) => setDraft({ ...draft, estimateMin: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('tasks.repeatLabel')}>
              <select value={draft.recurring} onChange={(e) => setDraft({ ...draft, recurring: e.target.value as Recurrence })}>
                {RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {r === 'none' ? t('tasks.noRepeat') : r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={t('tasks.iconLabel')}>
            <div className="mg-iconpick">
              {TASK_ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`mg-iconopt ${draft.icon === ic ? 'active' : ''}`}
                  onClick={() => setDraft({ ...draft, icon: ic })}
                >
                  <Icon name={ic} size={16} />
                </button>
              ))}
            </div>
          </Field>

          <div className="mg-form-actions">
            <button
              type="button"
              className="mg-btn glass"
              onClick={() => {
                if (draft.title.trim()) {
                  addTemplate({
                    title: draft.title.trim(),
                    notes: draft.notes.trim(),
                    priority: draft.priority,
                    area: draft.area,
                    icon: draft.icon,
                    addToTasks: true,
                  })
                }
              }}
            >
              <Icon name="bulb" size={14} /> {t('tasks.saveTemplate')}
            </button>
            <button type="button" className="mg-btn glass" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="mg-btn primary">
              {editId ? t('tasks.saveChanges') : t('tasks.addTask')}
            </button>
          </div>
        </form>
      </MgModal>

      <MgModal open={tplOpen} title={t('tasks.newTemplate')} onClose={() => setTplOpen(false)} width={480}>
        <form className="mg-form" onSubmit={saveTemplate}>
          <Field label={t('tasks.templateTitle')}>
            <input autoFocus value={tplDraft.title} onChange={(e) => setTplDraft({ ...tplDraft, title: e.target.value })} placeholder={t('tasks.titlePlaceholder')} />
          </Field>
          <div className="mg-form-row">
            <Field label={t('tasks.priorityLabel')}>
              <select value={tplDraft.priority} onChange={(e) => setTplDraft({ ...tplDraft, priority: e.target.value as Priority })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('tasks.areaLabel')}>
              <input
                value={tplDraft.area}
                onChange={(e) => setTplDraft({ ...tplDraft, area: e.target.value })}
                placeholder={t('tasks.areaPlaceholder')}
              />
            </Field>
          </div>
          <label className="mg-checkrow">
            <input type="checkbox" checked={tplDraft.addToTasks} onChange={(e) => setTplDraft({ ...tplDraft, addToTasks: e.target.checked })} />
            {t('tasks.addToTasks')}
          </label>
          <div className="mg-form-actions">
            <button type="button" className="mg-btn glass" onClick={() => setTplOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="mg-btn primary">
              {t('tasks.saveTemplate')}
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}
