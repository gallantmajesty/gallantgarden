import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import { AREA_META, PRIORITY_META, type LifeArea, type Priority, type Recurrence } from '../../../lib/magnet/types'
import { Icon } from '../Icon'
import { SectionHead, EmptyState } from '../ui'

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const AREAS: LifeArea[] = ['academic', 'personal', 'health', 'career', 'creative', 'social']
const RECURRENCES: Recurrence[] = ['none', 'daily', 'weekly', 'monthly']
const COL_LETTERS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] // gutter + 10 content cols

type Status = 'all' | 'open' | 'done'

export function SheetView() {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const addTask = useMagnet((s) => s.addTask)
  const updateTask = useMagnet((s) => s.updateTask)
  const toggleTask = useMagnet((s) => s.toggleTask)
  const deleteTask = useMagnet((s) => s.deleteTask)

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [active, setActive] = useState<{ l: string; r: number } | null>(null)

  const rows = useMemo(() => {
    let r = data.tasks.slice()
    if (status === 'open') r = r.filter((x) => !x.done)
    if (status === 'done') r = r.filter((x) => x.done)
    const term = q.trim().toLowerCase()
    if (term) {
      r = r.filter(
        (x) =>
          x.title.toLowerCase().includes(term) ||
          x.notes.toLowerCase().includes(term),
      )
    }
    r.sort(
      (a, b) =>
        PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight ||
        (a.due ?? '9999-12-31').localeCompare(b.due ?? '9999-12-31') ||
        a.createdAt.localeCompare(b.createdAt),
    )
    return r
  }, [data.tasks, q, status])

  const doneCount = useMemo(() => rows.filter((x) => x.done).length, [rows])

  const addRow = () => {
    addTask({ title: t('tasks.newTask') || 'New task' })
  }

  return (
    <div className="mg-sheet-wrap">
      <SectionHead
        icon="grid"
        title={t('taskMagnet.sheetTitle')}
        subtitle={t('taskMagnet.sheetDesc')}
        action={
          <button className="mg-sheet-add" onClick={addRow}>
            <Icon name="plus" size={16} /> {t('taskMagnet.sheetAdd')}
          </button>
        }
      />

      <div className="mg-sheet-toolbar">
        <div className="mg-sheet-search">
          <Icon name="note" size={15} />
          <input
            type="text"
            value={q}
            placeholder={t('taskMagnet.sheetSearch')}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mg-sheet-seg">
          {(['all', 'open', 'done'] as Status[]).map((s) => (
            <button
              key={s}
              className={status === s ? 'active' : ''}
              onClick={() => setStatus(s)}
            >
              {s === 'all' ? t('taskMagnet.sheetAll') : s === 'open' ? t('taskMagnet.sheetOpen') : t('taskMagnet.sheetCompleted')}
            </button>
          ))}
        </div>

        <div className="mg-sheet-count">
          {t('taskMagnet.sheetRows', { count: rows.length })}
          {doneCount > 0 && ` · ${t('taskMagnet.sheetDone', { done: doneCount })}`}
        </div>
      </div>

      {/* formula bar — feels like a real sheet: shows the active cell ref + its value */}
      <div className="mg-sheet-fbar">
        <span className="mg-sheet-fx">fx</span>
        <span className="mg-sheet-fref">{active ? `${active.l}${active.r + 2}` : ''}</span>
        <span className="mg-sheet-fval">
          {active && rows[active.r] ? rows[active.r].title : t('taskMagnet.sheetFbarHint')}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="journal" title={t('tasks.noTasksTitle')} body={t('tasks.noTasksBody')} />
      ) : (
        <div className="mg-sheet-scroll">
          <table className="mg-sheet">
            <thead>
              <tr>
                {COL_LETTERS.map((l, i) => (
                  <th key={i} className={i === 0 ? 'cell-rowhead' : i === COL_LETTERS.length - 1 ? 'cell-actions' : ''}>
                    {l || ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((task, idx) => (
                <tr
                  key={task.id}
                  className={task.done ? 'row-done' : ''}
                  onFocus={(e) => {
                    const cell = (e.target as HTMLElement).closest('td') as HTMLElement | null
                    const l = cell?.dataset?.col
                    if (l) setActive({ l, r: idx })
                  }}
                >
                  <td className="cell-row">{idx + 1}</td>
                  <td className="cell-check" data-col="A">
                    <button
                      className={`mg-sheet-check ${task.done ? 'on' : ''}`}
                      onClick={() => toggleTask(task.id)}
                      aria-label={task.done ? 'Mark open' : 'Mark done'}
                    >
                      {task.done && <Icon name="check" size={14} />}
                    </button>
                  </td>

                  <td className="cell-title" data-col="B">
                    <input
                      className="cell-input"
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    />
                  </td>

                  <td className="cell-priority" data-col="C" style={{ borderLeft: `3px solid ${PRIORITY_META[task.priority].color}` }}>
                    <select
                      className="cell-input"
                      value={task.priority}
                      onChange={(e) => updateTask(task.id, { priority: e.target.value as Priority })}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_META[p].label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="cell-area" data-col="D">
                    <select
                      className="cell-input"
                      value={task.area}
                      onChange={(e) => updateTask(task.id, { area: e.target.value as LifeArea })}
                    >
                      {AREAS.map((a) => (
                        <option key={a} value={a}>
                          {AREA_META[a].label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="cell-due" data-col="F">
                    <input
                      type="date"
                      className="cell-input"
                      value={task.due ?? ''}
                      onChange={(e) => updateTask(task.id, { due: e.target.value || null })}
                    />
                  </td>

                  <td className="cell-est" data-col="G">
                    <input
                      type="number"
                      min={0}
                      className="cell-input"
                      value={task.estimateMin || ''}
                      placeholder="—"
                      onChange={(e) =>
                        updateTask(task.id, { estimateMin: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </td>

                  <td className="cell-recur" data-col="H">
                    <select
                      className="cell-input"
                      value={task.recurring}
                      onChange={(e) => updateTask(task.id, { recurring: e.target.value as Recurrence })}
                    >
                      {RECURRENCES.map((r) => (
                        <option key={r} value={r}>
                          {r === 'none' ? t('tasks.noRepeat') : r[0].toUpperCase() + r.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="cell-notes" data-col="I">
                    <input
                      className="cell-input"
                      value={task.notes}
                      placeholder="—"
                      onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                    />
                  </td>

                  <td className="cell-actions">
                    <button
                      className="mg-sheet-del"
                      onClick={() => deleteTask(task.id)}
                      aria-label={t('common.delete')}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
