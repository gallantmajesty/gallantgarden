import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import {
  AREA_META,
  PRIORITY_META,
  type LifeArea,
  type Priority,
  type Recurrence,
  type Task,
  type Goal,
  type Habit,
} from '../../../lib/magnet/types'
import { SectionHead, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'
import { taskPower, subtaskPower, habitPower, milestonePower, goalCompletePower } from '../../../lib/magnet/score'
import { useMxpFloat } from '../MxpFeedback'
import { useNow } from '../useNow'
import { dayKey, addDays } from '../../../lib/magnet/insights'
import { GoalCard } from './GoalsView'
import { HabitRow } from './HabitsView'

type StatusFilter = 'open' | 'done' | 'all'
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const AREAS: LifeArea[] = ['academic', 'personal', 'health', 'career', 'creative', 'social']
const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly']
const TASK_ICONS = ['check', 'book', 'brain', 'rocket', 'star', 'flag', 'bulb', 'heart', 'fire', 'pin']

interface Draft {
  title: string
  notes: string
  priority: Priority
  subject: string
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
    subject: '',
    area: 'academic',
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
  const toggleBlockedBy = useMagnet((s) => s.toggleBlockedBy)
  const addTemplate = useMagnet((s) => s.addTemplate)
  const deleteTemplate = useMagnet((s) => s.deleteTemplate)
  const createFromTemplate = useMagnet((s) => s.createFromTemplate)
  const addMilestone = useMagnet((s) => s.addMilestone)
  const toggleMilestone = useMagnet((s) => s.toggleMilestone)
  const updateGoal = useMagnet((s) => s.updateGoal)
  const deleteGoal = useMagnet((s) => s.deleteGoal)
  const linkProjectGoal = useMagnet((s) => s.linkProjectGoal)
  const unlinkProjectGoal = useMagnet((s) => s.unlinkProjectGoal)
  const toggleHabitToday = useMagnet((s) => s.toggleHabitToday)
  const toggleHabitFreeze = useMagnet((s) => s.toggleHabitFreeze)
  const deleteHabit = useMagnet((s) => s.deleteHabit)

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
    area: 'academic' as LifeArea,
    subject: '',
    icon: 'check',
    addToTasks: true,
  })

  const [doneAnim, setDoneAnim] = useState<string | null>(null)
  const float = useMxpFloat()

  function todayKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Habit streak calculation (mirrors HabitsView)
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

  // When the calendar (or another view) asks to create a task on a specific date.
  useEffect(() => {
    if (prefillDue) {
      startCreate(prefillDue)
      onPrefillDue?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDue])

  const baseList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.tasks
      .filter((tk) => (status === 'all' ? true : status === 'done' ? tk.done : !tk.done))
      .filter((tk) => (area === 'all' ? true : tk.area === area))
      .filter((tk) =>
        q ? tk.title.toLowerCase().includes(q) || tk.subject.toLowerCase().includes(q) || tk.notes.toLowerCase().includes(q) : true,
      )
  }, [data.tasks, status, area, search])

  // Goals filtered by search/status
  const goalsList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.goals
      .filter((g) => (status === 'all' ? true : status === 'done' ? g.progress >= 100 : g.progress < 100))
      .filter((g) =>
        q ? g.title.toLowerCase().includes(q) || g.detail.toLowerCase().includes(q) : true,
      )
  }, [data.goals, status, search])

  // Habits filtered by search
  const habitsList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.habits
      .filter((h) =>
        q ? h.title.toLowerCase().includes(q) : true,
      )
  }, [data.habits, search])

  // Smart sort: open tasks first, then by priority weight, then by due date.
  // Completed tasks (history) are sorted newest-completed first.
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
      const w = PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight
      if (w !== 0) return w
      return (a.due ?? '9999').localeCompare(b.due ?? '9999')
    })
  }, [baseList, status])

  const openCount = data.tasks.filter((tk) => !tk.done).length
  const doneCount = data.tasks.length - openCount

  // Unified list: tasks, goals, habits as sections
  const filteredSections = useMemo(() => {
    const sections: { type: 'tasks'; items: typeof baseList } | { type: 'goals'; items: typeof goalsList } | { type: 'habits'; items: typeof habitsList }[] = []
    if (filtered.length > 0) sections.push({ type: 'tasks', items: filtered })
    if (goalsList.length > 0) sections.push({ type: 'goals', items: goalsList })
    if (habitsList.length > 0) sections.push({ type: 'habits', items: habitsList })
    return sections
  }, [filtered, goalsList, habitsList])

  const now = useNow()
  const habitToday = dayKey(now)
  const habitGridDays = useMemo(() => {
    const out: string[] = []
    const GRID_DAYS = 21
    for (let i = GRID_DAYS - 1; i >= 0; i--) out.push(dayKey(addDays(now, -i)))
    return out
  }, [now])

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
      subject: tk.subject,
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
      subject: draft.subject.trim(),
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

  function onCheck(tk: Task, e: { clientX: number; clientY: number }) {
    if (!tk.done) {
      setDoneAnim(tk.id)
      setTimeout(() => setDoneAnim((cur) => (cur === tk.id ? null : cur)), 850)
      // Mirror the store: tasks pay power only when due today or undated.
      const eligible = tk.due ? tk.due === todayKey() : true
      if (eligible) float.push(e, taskPower(tk))
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
      subject: tplDraft.subject.trim(),
      area: tplDraft.area,
      icon: tplDraft.icon,
      addToTasks: tplDraft.addToTasks,
    })
    setTplOpen(false)
    setTplDraft({ title: '', notes: '', priority: 'medium', area: 'academic', subject: '', icon: 'check', addToTasks: true })
  }

  return (
    <div className="mg-view">
      <SectionHead
        icon="check"
        title={t('tasks.title')}
        subtitle={`${openCount} ${t('tasks.openCount')} · ${data.tasks.length} ${t('tasks.totalCount')}`}
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
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder={t('tasks.quickPlaceholder')}
        />
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

      {/* Filter bar — status + area + search (no clutter, no fake controls). */}
      <div className="mg-filterbar">
        <div className="mg-seg">
          {(['open', 'done', 'all'] as StatusFilter[]).map((s) => (
            <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
              {s === 'open' ? t('tasks.filter_open') : s === 'done' ? t('tasks.filter_done') : t('tasks.filter_all')}
            </button>
          ))}
        </div>
        <select
          className="mg-areapick"
          value={area}
          onChange={(e) => setArea(e.target.value as LifeArea | 'all')}
        >
          <option value="all">{t('tasks.allAreas')}</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {AREA_META[a].label}
            </option>
          ))}
        </select>
        <div className="mg-search">
          <Icon name="target" size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('tasks.searchPlaceholder')} />
        </div>
      </div>

      {filteredSections.length === 0 ? (
        <EmptyState
          icon="check"
          title={t('tasks.noTasksTitle')}
          body={data.tasks.length === 0 && data.goals.length === 0 && data.habits.length === 0 ? t('tasks.noTasksBody') : t('tasks.noTasksMatch')}
          action={
            data.tasks.length === 0 && data.goals.length === 0 && data.habits.length === 0 ? (
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
        <div className="mg-unified">
          {filteredSections.map((section) => {
            const title =
              section.type === 'tasks' ? t('tasks.title') : section.type === 'goals' ? t('goals.title') : t('habits.title')
            const secIcon = section.type === 'tasks' ? 'check' : section.type === 'goals' ? 'target' : 'fire'
            return (
              <section key={section.type} className={`mg-unified-section mg-sec-${section.type}`}>
                <div className="mg-section-divider">
                  <span className="mg-section-title">
                    <Icon name={secIcon} size={15} /> {title}
                  </span>
                </div>

                {section.type === 'tasks' && (
                  <ul className="mg-tasklist">
                    {(section.items as Task[]).map((task) => {
                      const a = AREA_META[task.area]
                      const subsDone = task.subtasks.filter((s) => s.done).length
                      const isOpen = expanded === task.id
                      const openBlockers = task.blockedBy
                        .map((id) => data.tasks.find((x) => x.id === id))
                        .filter((b): b is Task => !!b && !b.done)
                      const isBlocked = !task.done && openBlockers.length > 0
                      return (
                        <li
                          key={task.id}
                          className={`mg-taskcard ${task.done ? 'done' : ''} ${isBlocked ? 'blocked' : ''} ${
                            doneAnim === task.id ? 'mg-burst' : ''
                          }`}
                          style={{ ['--mg-prio' as string]: PRIORITY_META[task.priority].color }}
                        >
                          <div className="mg-taskcard-main">
                            <button
                              className="mg-check"
                              onClick={(e) => onCheck(task, e)}
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
                                <span className="mg-task-title">
                                  {task.title}
                                  {isBlocked && (
                                    <span className="mg-task-lock" title={t('tasks.blockedHint')}>
                                      <Icon name="lock" size={12} />
                                    </span>
                                  )}
                                </span>
                                <span className="mg-task-meta">
                                  <span className="mg-tag" style={{ ['--mg-tag' as string]: a.color }}>
                                    {a.label}
                                  </span>
                                  <span className="mg-tag soft" style={{ ['--mg-tag' as string]: PRIORITY_META[task.priority].color }}>
                                    {PRIORITY_META[task.priority].label}
                                  </span>
                                  {task.subject && <span className="mg-task-subject">{task.subject}</span>}
                                  {task.due && (
                                    <span className="mg-task-due">
                                      <Icon name="calendar" size={12} /> {task.due}
                                    </span>
                                  )}
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
                              <button className="mg-iconbtn" onClick={() => startEdit(task)} aria-label="Edit">
                                <Icon name="edit" size={15} />
                              </button>
                              <button className="mg-iconbtn danger" onClick={() => deleteTask(task.id)} aria-label="Delete">
                                <Icon name="trash" size={15} />
                              </button>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="mg-taskcard-detail">
                              {task.notes && <p className="mg-task-notes">{task.notes}</p>}

                              <div className="mg-deps">
                                <div className="mg-deps-head">
                                  <Icon name="link" size={13} /> {t('tasks.dependsOn')}
                                  <select
                                    className="mg-dep-add"
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) toggleBlockedBy(task.id, e.target.value)
                                    }}
                                  >
                                    <option value="">+ {t('tasks.addBlocker')}</option>
                                    {data.tasks
                                      .filter((x) => x.id !== task.id && !task.blockedBy.includes(x.id))
                                      .map((x) => (
                                        <option key={x.id} value={x.id}>
                                          {x.title}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                {task.blockedBy.length === 0 ? (
                                  <small className="mg-muted">{t('tasks.blockedHint')}</small>
                                ) : (
                                  <ul className="mg-deplist">
                                    {task.blockedBy.map((id) => {
                                      const b = data.tasks.find((x) => x.id === id)
                                      if (!b) return null
                                      return (
                                        <li key={id} className={b.done ? 'done' : ''}>
                                          <Icon name={b.done ? 'check' : 'lock'} size={12} /> {b.title}
                                          <button className="mg-iconbtn danger" onClick={() => toggleBlockedBy(task.id, id)} aria-label="Unblock">
                                            <Icon name="close" size={11} />
                                          </button>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                )}
                              </div>

                              <ul className="mg-sublist">
                                {task.subtasks.map((s) => (
                                  <li key={s.id}>
                                    <button
                                      className={`mg-subcheck ${s.done ? 'done' : ''}`}
                                      onClick={(e) => {
                                        if (!task.done && !s.done) float.push(e, subtaskPower())
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
                        </li>
                      )
                    })}
                  </ul>
                )}

                {section.type === 'goals' && (
                  <div className="mg-goalgrid">
                    {(section.items as Goal[]).map((g) => (
                      <GoalCard
                        key={g.id}
                        goal={g}
                        projects={data.projects}
                        linkedProject={data.projects.find((p) => p.id === g.projectId) ?? null}
                        taskCount={data.tasks.filter((tk) => tk.projectId === g.projectId).length}
                        msInput={msInput[g.id] ?? ''}
                        onMsInput={(v) => setMsInput((m) => ({ ...m, [g.id]: v }))}
                        onAddMs={() => {
                          const v = (msInput[g.id] ?? '').trim()
                          if (!v) return
                          addMilestone(g.id, v)
                          setMsInput((m) => ({ ...m, [g.id]: '' }))
                        }}
                        onToggleMs={(id, e) => {
                          const m = g.milestones.find((x) => x.id === id)
                          if (m && !m.done) float.push(e, milestonePower())
                          const doneAfter = g.milestones.filter((x) => (x.id !== id ? x.done : !x.done)).length
                          const afterPct = g.milestones.length ? Math.round((doneAfter / g.milestones.length) * 100) : g.progress
                          if (afterPct >= 100 && g.progress < 100) float.push(e, goalCompletePower())
                          toggleMilestone(g.id, id)
                        }}
                        onProgress={(p) => updateGoal(g.id, { progress: p })}
                        onDelete={() => deleteGoal(g.id)}
                        onLinkProject={(projId) => (projId ? linkProjectGoal(projId, g.id) : unlinkProjectGoal(g.id))}
                      />
                    ))}
                  </div>
                )}

                {section.type === 'habits' && (
                  <div className="mg-habitlist">
                    {(section.items as Habit[]).map((h) => (
                      <HabitRow
                        key={h.id}
                        habit={h}
                        gridDays={habitGridDays}
                        today={habitToday}
                        streak={habitStreak(h.history, h.freezeDays, now)}
                        onToggleToday={(e) => {
                          const doneToday = h.history.includes(habitToday)
                          if (!doneToday) float.push(e, habitPower())
                          toggleHabitToday(h.id)
                        }}
                        onFreeze={() => toggleHabitFreeze(h.id)}
                        onDelete={() => deleteHabit(h.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* History — completed tasks, newest first (like a chat log). */}
      {doneCount > 0 && status !== 'done' && (
        <div className="mg-history">
          <button className="mg-history-head" onClick={() => setHistoryOpen((o) => !o)}>
            <span style={{ display: 'inline-flex', transform: historyOpen ? 'rotate(90deg)' : 'none' }}><Icon name="chevron" size={16} /></span>
            <Icon name="clock" size={15} />
            {t('tasks.history')}
            <span className="mg-history-count">{doneCount}</span>
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
              <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as LifeArea })}>
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
                list="mg-subjects"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder={t('tasks.subjectPlaceholder')}
              />
              <datalist id="mg-subjects">
                {data.subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label={t('tasks.dueDateLabel')}>
              <input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
            </Field>
          </div>

          <div className="mg-form-row">
            <Field label={t('tasks.estimateLabel')}>
              <input
                type="number"
                min={0}
                step={5}
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
                    subject: draft.subject.trim(),
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
              <select value={tplDraft.area} onChange={(e) => setTplDraft({ ...tplDraft, area: e.target.value as LifeArea })}>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {AREA_META[a].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t('tasks.subjectLabel')}>
            <input value={tplDraft.subject} onChange={(e) => setTplDraft({ ...tplDraft, subject: e.target.value })} placeholder={t('tasks.subjectPlaceholder')} />
          </Field>
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

      {float.node}
    </div>
  )
}
