import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import type { Goal, GoalKind, Project } from '../../../lib/magnet/types'
import { SectionHead, Panel, ProgressRing, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'

const KINDS: { key: GoalKind; labelKey: string; icon: string; blurbKey: string }[] = [
  { key: 'short', labelKey: 'goals.kindShort', icon: 'flag', blurbKey: 'goals.blurbShort' },
  { key: 'long', labelKey: 'goals.kindLong', icon: 'target', blurbKey: 'goals.blurbLong' },
  { key: 'life', labelKey: 'goals.kindLife', icon: 'star', blurbKey: 'goals.blurbLife' },
  { key: 'dream', labelKey: 'goals.kindDream', icon: 'rocket', blurbKey: 'goals.blurbDream' },
]
const GOAL_COLORS = ['#9a6cff', '#ff6f9c', '#46d6a0', '#ffb454', '#4fd1e0', '#b76cff', '#ff5d6c']
const PROJECT_ICONS = ['flag', 'rocket', 'book', 'brain', 'star', 'bulb', 'heart', 'fire']

interface Draft {
  title: string
  detail: string
  kind: GoalKind
  target: string
  color: string
}
function emptyDraft(): Draft {
  return { title: '', detail: '', kind: 'long', target: '', color: GOAL_COLORS[0] }
}

function projectProgress(tasks: { projectId: string | null; done: boolean }[], projectId: string) {
  const pts = tasks.filter((t) => t.projectId === projectId)
  const done = pts.filter((t) => t.done).length
  return { total: pts.length, pct: pts.length ? Math.round((done / pts.length) * 100) : 0 }
}

export function GoalsView() {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const addGoal = useMagnet((s) => s.addGoal)
  const updateGoal = useMagnet((s) => s.updateGoal)
  const deleteGoal = useMagnet((s) => s.deleteGoal)
  const addMilestone = useMagnet((s) => s.addMilestone)
  const toggleMilestone = useMagnet((s) => s.toggleMilestone)
  const addProject = useMagnet((s) => s.addProject)
  const deleteProject = useMagnet((s) => s.deleteProject)
  const linkProjectGoal = useMagnet((s) => s.linkProjectGoal)
  const unlinkProjectGoal = useMagnet((s) => s.unlinkProjectGoal)

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [msInput, setMsInput] = useState<Record<string, string>>({})

  const [projOpen, setProjOpen] = useState(false)
  const [projTitle, setProjTitle] = useState('')
  const [projIcon, setProjIcon] = useState(PROJECT_ICONS[0])
  const [projColor, setProjColor] = useState(GOAL_COLORS[0])

  function save(e: React.FormEvent) {
    e.preventDefault()
    const title = draft.title.trim()
    if (!title) return
    addGoal({
      title,
      detail: draft.detail.trim(),
      kind: draft.kind,
      target: draft.target || null,
      color: draft.color,
    })
    setModalOpen(false)
    setDraft(emptyDraft())
  }

  function saveProject(e: React.FormEvent) {
    e.preventDefault()
    const title = projTitle.trim()
    if (!title) return
    addProject(title, projColor, projIcon)
    setProjTitle('')
    setProjIcon(PROJECT_ICONS[0])
    setProjColor(GOAL_COLORS[0])
    setProjOpen(false)
  }

  return (
    <div className="mg-view">
      <SectionHead
        icon="target"
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        action={
          <div className="mg-view-actions">
            <button className="mg-btn ghost" onClick={() => setProjOpen(true)}>
              <Icon name="flag" size={16} /> {t('goals.linkProject')}
            </button>
            <button className="mg-btn primary" onClick={() => setModalOpen(true)}>
              <Icon name="plus" size={16} /> {t('goals.newGoal')}
            </button>
          </div>
        }
      />

      {/* ---- Projects: the work that serves goals ---- */}
      {data.projects.length > 0 || projOpen ? (
        <Panel className="mg-projects">
          <div className="mg-panel-head">
            <h3>
              <Icon name="flag" size={17} /> {t('goals.linkProject')}
            </h3>
          </div>
          {data.projects.length === 0 ? (
            <p className="mg-muted">{t('goals.noProject')}</p>
          ) : (
            <div className="mg-project-grid">
              {data.projects.map((p: Project) => {
                const pr = projectProgress(data.tasks, p.id)
                const linkedGoal = data.goals.find((g) => g.projectId === p.id)
                return (
                  <div key={p.id} className="mg-project-card" style={{ ['--mg-tag' as string]: p.color }}>
                    <div className="mg-project-top">
                      <span className="mg-project-ico">
                        <Icon name={p.icon} size={15} />
                      </span>
                      <strong>{p.title}</strong>
                      <button className="mg-iconbtn danger" onClick={() => deleteProject(p.id)} aria-label={t('common.delete')}>
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                    <div className="mg-project-bar">
                      <i style={{ width: `${pr.pct}%`, background: p.color }} />
                    </div>
                    <small>
                      {pr.pct}% · {pr.total} {t('tasks.title').toLowerCase()}
                      {linkedGoal && (
                        <span className="mg-project-goal">
                          {' '}→ {linkedGoal.title}
                        </span>
                      )}
                    </small>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      ) : null}

      {data.goals.length === 0 ? (
        <EmptyState icon="rocket" title={t('goals.emptyTitle')} body={t('goals.emptyBody')} />
      ) : (
        KINDS.map((k) => {
          const goals = data.goals.filter((g) => g.kind === k.key)
          if (goals.length === 0) return null
          return (
            <div key={k.key} className="mg-goalgroup">
              <h3 className="mg-goalgroup-head">
                <Icon name={k.icon} size={17} /> {t(k.labelKey)}
                <span className="mg-muted">{t(k.blurbKey)}</span>
              </h3>
              <div className="mg-goalgrid">
                {goals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    projects={data.projects}
                    linkedProject={data.projects.find((p) => p.id === g.projectId) ?? null}
                    taskCount={data.tasks.filter((t) => t.projectId === g.projectId).length}
                    msInput={msInput[g.id] ?? ''}
                    onMsInput={(v) => setMsInput((m) => ({ ...m, [g.id]: v }))}
                    onAddMs={() => {
                      const v = (msInput[g.id] ?? '').trim()
                      if (!v) return
                      addMilestone(g.id, v)
                      setMsInput((m) => ({ ...m, [g.id]: '' }))
                    }}
                    onToggleMs={(id) => toggleMilestone(g.id, id)}
                    onProgress={(p) => updateGoal(g.id, { progress: p })}
                    onDelete={() => deleteGoal(g.id)}
                    onLinkProject={(projId) => (projId ? linkProjectGoal(projId, g.id) : unlinkProjectGoal(g.id))}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      <MgModal open={modalOpen} title={t('goals.newGoalModal')} onClose={() => setModalOpen(false)} width={520}>
        <form className="mg-form" onSubmit={save}>
          <Field label={t('goals.goalLabel')}>
            <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t('goals.goalPlaceholder')} />
          </Field>
          <Field label={t('goals.whyLabel')}>
            <textarea rows={2} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} placeholder={t('goals.whyPlaceholder')} />
          </Field>
          <div className="mg-form-row">
            <Field label={t('goals.horizonLabel')}>
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as GoalKind })}>
                {KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {t(k.labelKey)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('goals.targetDateLabel')}>
              <input type="date" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} />
            </Field>
          </div>
          <Field label={t('goals.colorLabel')}>
            <div className="mg-swatches">
              {GOAL_COLORS.map((c) => (
                <button type="button" key={c} className={`mg-swatch ${draft.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })} />
              ))}
            </div>
          </Field>
          <div className="mg-form-actions">
            <button type="button" className="mg-btn ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              Add goal
            </button>
          </div>
        </form>
      </MgModal>

      <MgModal open={projOpen} title={t('goals.linkProject')} onClose={() => setProjOpen(false)} width={460}>
        <form className="mg-form" onSubmit={saveProject}>
          <Field label={t('goals.goalLabel')}>
            <input autoFocus value={projTitle} onChange={(e) => setProjTitle(e.target.value)} placeholder={t('goals.goalPlaceholder')} />
          </Field>
          <Field label={t('common.icon')}>
            <div className="mg-iconpick">
              {PROJECT_ICONS.map((ic) => (
                <button type="button" key={ic} className={`mg-iconopt ${projIcon === ic ? 'active' : ''}`} onClick={() => setProjIcon(ic)}>
                  <Icon name={ic} size={16} />
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('goals.colorLabel')}>
            <div className="mg-swatches">
              {GOAL_COLORS.map((c) => (
                <button type="button" key={c} className={`mg-swatch ${projColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setProjColor(c)} />
              ))}
            </div>
          </Field>
          <div className="mg-form-actions">
            <button type="button" className="mg-btn ghost" onClick={() => setProjOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              {t('goals.linkProject')}
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}

function GoalCard({
  goal,
  projects,
  linkedProject,
  taskCount,
  msInput,
  onMsInput,
  onAddMs,
  onToggleMs,
  onProgress,
  onDelete,
  onLinkProject,
}: {
  goal: Goal
  projects: Project[]
  linkedProject: Project | null
  taskCount: number
  msInput: string
  onMsInput: (v: string) => void
  onAddMs: () => void
  onToggleMs: (id: string) => void
  onProgress: (p: number) => void
  onDelete: () => void
  onLinkProject: (projectId: string | null) => void
}) {
  const { t } = useTranslation()
  const hasMs = goal.milestones.length > 0
  return (
    <Panel className="mg-goalcard">
      <div className="mg-goalcard-top" style={{ ['--mg-goal' as string]: goal.color }}>
        <ProgressRing pct={goal.progress / 100} size={62} label={`${goal.progress}%`} />
        <div className="mg-goalcard-head">
          <h4>{goal.title}</h4>
          {goal.target && (
            <span className="mg-goal-target">
              <Icon name="calendar" size={12} /> {goal.target}
            </span>
          )}
        </div>
        <button className="mg-iconbtn danger" onClick={onDelete} aria-label={t('goals.deleteGoal')}>
          <Icon name="trash" size={15} />
        </button>
      </div>

      {goal.detail && <p className="mg-goal-detail">{goal.detail}</p>}

      {/* linked project */}
      <div className="mg-goal-project">
        <span className="mg-goal-project-label">
          <Icon name="link" size={13} /> {t('goals.linkProject')}
        </span>
        <select
          className="mg-goal-project-select"
          value={goal.projectId ?? ''}
          onChange={(e) => onLinkProject(e.target.value || null)}
        >
          <option value="">{t('goals.noProject')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {linkedProject && (
          <span className="mg-goal-project-info">
            {taskCount} {t('tasks.title').toLowerCase().replace(/s$/, '')}
            {taskCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {!hasMs && (
        <label className="mg-goal-slider">
          <span>{t('goals.progress')}</span>
          <input type="range" min={0} max={100} value={goal.progress} onChange={(e) => onProgress(Number(e.target.value))} />
        </label>
      )}

      <ul className="mg-mslist">
        {goal.milestones.map((m) => (
          <li key={m.id}>
            <button className={`mg-subcheck ${m.done ? 'done' : ''}`} onClick={() => onToggleMs(m.id)}>
              <Icon name="check" size={11} />
            </button>
            <span className={m.done ? 'done' : ''}>{m.title}</span>
          </li>
        ))}
      </ul>

      <form
        className="mg-subadd"
        onSubmit={(e) => {
          e.preventDefault()
          onAddMs()
        }}
      >
        <input value={msInput} onChange={(e) => onMsInput(e.target.value)} placeholder={t('goals.addMilestone')} />
        <button type="submit">
          <Icon name="plus" size={14} />
        </button>
      </form>
    </Panel>
  )
}
