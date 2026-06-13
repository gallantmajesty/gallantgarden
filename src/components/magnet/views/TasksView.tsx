import { useMemo, useState } from 'react'
import { useMagnet } from '../../../store/magnet'
import {
  AREA_META,
  PRIORITY_META,
  type LifeArea,
  type Priority,
  type Recurrence,
  type Task,
} from '../../../lib/magnet/types'
import { SectionHead, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'

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

export function TasksView() {
  const data = useMagnet((s) => s.data)
  const addTask = useMagnet((s) => s.addTask)
  const updateTask = useMagnet((s) => s.updateTask)
  const toggleTask = useMagnet((s) => s.toggleTask)
  const deleteTask = useMagnet((s) => s.deleteTask)
  const addSubtask = useMagnet((s) => s.addSubtask)
  const toggleSubtask = useMagnet((s) => s.toggleSubtask)
  const removeSubtask = useMagnet((s) => s.removeSubtask)

  const [status, setStatus] = useState<StatusFilter>('open')
  const [area, setArea] = useState<LifeArea | 'all'>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [subInput, setSubInput] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.tasks
      .filter((t) => (status === 'all' ? true : status === 'done' ? t.done : !t.done))
      .filter((t) => (area === 'all' ? true : t.area === area))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        const w = PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight
        if (w !== 0) return w
        return (a.due ?? '9999').localeCompare(b.due ?? '9999')
      })
  }, [data.tasks, status, area, search])

  const openCount = data.tasks.filter((t) => !t.done).length

  function startCreate() {
    setEditId(null)
    setDraft(emptyDraft())
    setModalOpen(true)
  }
  function startEdit(t: Task) {
    setEditId(t.id)
    setDraft({
      title: t.title,
      notes: t.notes,
      priority: t.priority,
      subject: t.subject,
      area: t.area,
      due: t.due ?? '',
      estimateMin: t.estimateMin,
      recurring: t.recurring,
      icon: t.icon,
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

  return (
    <div className="mg-view">
      <SectionHead
        icon="check"
        title="Tasks"
        subtitle={`${openCount} open · ${data.tasks.length} total`}
        action={
          <button className="mg-btn primary" onClick={startCreate}>
            <Icon name="plus" size={16} /> New task
          </button>
        }
      />

      {/* filter bar */}
      <div className="mg-filterbar">
        <div className="mg-seg">
          {(['open', 'done', 'all'] as StatusFilter[]).map((s) => (
            <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="mg-chipscroll">
          <button className={`mg-fchip ${area === 'all' ? 'active' : ''}`} onClick={() => setArea('all')}>
            All areas
          </button>
          {AREAS.map((a) => (
            <button
              key={a}
              className={`mg-fchip ${area === a ? 'active' : ''}`}
              onClick={() => setArea(a)}
              style={{ ['--mg-tag' as string]: AREA_META[a].color }}
            >
              <Icon name={AREA_META[a].icon} size={13} /> {AREA_META[a].label}
            </button>
          ))}
        </div>
        <div className="mg-search">
          <Icon name="target" size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="check"
          title="No tasks here"
          body="Create your first task and start filling your world with momentum."
        />
      ) : (
        <ul className="mg-tasklist">
          {filtered.map((t) => {
            const a = AREA_META[t.area]
            const subsDone = t.subtasks.filter((s) => s.done).length
            const isOpen = expanded === t.id
            return (
              <li key={t.id} className={`mg-taskcard ${t.done ? 'done' : ''}`}>
                <div className="mg-taskcard-main">
                  <button
                    className="mg-check"
                    onClick={() => toggleTask(t.id)}
                    aria-label="Complete"
                    style={{ ['--mg-check-tone' as string]: PRIORITY_META[t.priority].color }}
                  >
                    <Icon name="check" size={14} />
                  </button>
                  <button className="mg-taskcard-body" onClick={() => setExpanded(isOpen ? null : t.id)}>
                    <span className="mg-task-icon" style={{ color: PRIORITY_META[t.priority].color }}>
                      <Icon name={t.icon} size={16} />
                    </span>
                    <span className="mg-task-text">
                      <span className="mg-task-title">{t.title}</span>
                      <span className="mg-task-meta">
                        <span className="mg-tag" style={{ ['--mg-tag' as string]: a.color }}>
                          {a.label}
                        </span>
                        <span
                          className="mg-tag soft"
                          style={{ ['--mg-tag' as string]: PRIORITY_META[t.priority].color }}
                        >
                          {PRIORITY_META[t.priority].label}
                        </span>
                        {t.subject && <span className="mg-task-subject">{t.subject}</span>}
                        {t.due && (
                          <span className="mg-task-due">
                            <Icon name="calendar" size={12} /> {t.due}
                          </span>
                        )}
                        {t.estimateMin > 0 && (
                          <span className="mg-task-est">
                            <Icon name="clock" size={12} /> {t.estimateMin}m
                          </span>
                        )}
                        {t.recurring !== 'none' && (
                          <span className="mg-task-rec">
                            <Icon name="spark" size={12} /> {t.recurring}
                          </span>
                        )}
                        {t.subtasks.length > 0 && (
                          <span className="mg-task-subcount">
                            {subsDone}/{t.subtasks.length}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  <div className="mg-taskcard-actions">
                    <button className="mg-iconbtn" onClick={() => startEdit(t)} aria-label="Edit">
                      <Icon name="edit" size={15} />
                    </button>
                    <button className="mg-iconbtn danger" onClick={() => deleteTask(t.id)} aria-label="Delete">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mg-taskcard-detail">
                    {t.notes && <p className="mg-task-notes">{t.notes}</p>}
                    <ul className="mg-sublist">
                      {t.subtasks.map((s) => (
                        <li key={s.id}>
                          <button
                            className={`mg-subcheck ${s.done ? 'done' : ''}`}
                            onClick={() => toggleSubtask(t.id, s.id)}
                          >
                            <Icon name="check" size={11} />
                          </button>
                          <span className={s.done ? 'done' : ''}>{s.title}</span>
                          <button className="mg-iconbtn danger" onClick={() => removeSubtask(t.id, s.id)}>
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
                        addSubtask(t.id, v)
                        setSubInput('')
                      }}
                    >
                      <input
                        value={subInput}
                        onChange={(e) => setSubInput(e.target.value)}
                        placeholder="Add a subtask…"
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

      <MgModal
        open={modalOpen}
        title={editId ? 'Edit task' : 'New task'}
        onClose={() => setModalOpen(false)}
        width={520}
      >
        <form className="mg-form" onSubmit={save}>
          <Field label="Title">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="What needs doing?"
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Optional detail, links, context…"
            />
          </Field>

          <div className="mg-form-row">
            <Field label="Priority">
              <select
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Life area">
              <select
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value as LifeArea })}
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
            <Field label="Subject">
              <input
                list="mg-subjects"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder="e.g. Physics"
              />
              <datalist id="mg-subjects">
                {data.subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Due date">
              <input type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
            </Field>
          </div>

          <div className="mg-form-row">
            <Field label="Estimate (min)">
              <input
                type="number"
                min={0}
                step={5}
                value={draft.estimateMin || ''}
                onChange={(e) => setDraft({ ...draft, estimateMin: Number(e.target.value) })}
              />
            </Field>
            <Field label="Repeat">
              <select
                value={draft.recurring}
                onChange={(e) => setDraft({ ...draft, recurring: e.target.value as Recurrence })}
              >
                {RECURRENCES.map((r) => (
                  <option key={r} value={r}>
                    {r === 'none' ? 'No repeat' : r[0].toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Icon">
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
            <button type="button" className="mg-btn ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              {editId ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}
