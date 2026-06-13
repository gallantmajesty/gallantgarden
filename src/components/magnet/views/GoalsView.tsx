import { useState } from 'react'
import { useMagnet } from '../../../store/magnet'
import type { Goal, GoalKind } from '../../../lib/magnet/types'
import { SectionHead, Panel, ProgressRing, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'

const KINDS: { key: GoalKind; label: string; icon: string; blurb: string }[] = [
  { key: 'short', label: 'Short-term', icon: 'flag', blurb: 'This term' },
  { key: 'long', label: 'Long-term', icon: 'target', blurb: 'This year' },
  { key: 'life', label: 'Life goals', icon: 'star', blurb: 'The big picture' },
  { key: 'dream', label: 'Dream projects', icon: 'rocket', blurb: 'Someday / maybe' },
]
const GOAL_COLORS = ['#9a6cff', '#ff6f9c', '#46d6a0', '#ffb454', '#4fd1e0', '#b76cff', '#ff5d6c']

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

export function GoalsView() {
  const data = useMagnet((s) => s.data)
  const addGoal = useMagnet((s) => s.addGoal)
  const updateGoal = useMagnet((s) => s.updateGoal)
  const deleteGoal = useMagnet((s) => s.deleteGoal)
  const addMilestone = useMagnet((s) => s.addMilestone)
  const toggleMilestone = useMagnet((s) => s.toggleMilestone)

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [msInput, setMsInput] = useState<Record<string, string>>({})

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

  return (
    <div className="mg-view">
      <SectionHead
        icon="target"
        title="Goals & Dreams"
        subtitle="From this term's targets to the life you're building toward"
        action={
          <button className="mg-btn primary" onClick={() => setModalOpen(true)}>
            <Icon name="plus" size={16} /> New goal
          </button>
        }
      />

      {data.goals.length === 0 ? (
        <EmptyState
          icon="rocket"
          title="Name what you're reaching for"
          body="A goal you can see is a goal you can grow toward. Add your first — big or small."
        />
      ) : (
        KINDS.map((k) => {
          const goals = data.goals.filter((g) => g.kind === k.key)
          if (goals.length === 0) return null
          return (
            <div key={k.key} className="mg-goalgroup">
              <h3 className="mg-goalgroup-head">
                <Icon name={k.icon} size={17} /> {k.label}
                <span className="mg-muted">{k.blurb}</span>
              </h3>
              <div className="mg-goalgrid">
                {goals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
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
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      <MgModal open={modalOpen} title="New goal" onClose={() => setModalOpen(false)} width={520}>
        <form className="mg-form" onSubmit={save}>
          <Field label="Goal">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="What do you want to achieve?"
            />
          </Field>
          <Field label="Why it matters">
            <textarea
              rows={2}
              value={draft.detail}
              onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
              placeholder="The reason behind it — your future self reading this will thank you."
            />
          </Field>
          <div className="mg-form-row">
            <Field label="Horizon">
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as GoalKind })}>
                {KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target date">
              <input type="date" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} />
            </Field>
          </div>
          <Field label="Color">
            <div className="mg-swatches">
              {GOAL_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`mg-swatch ${draft.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setDraft({ ...draft, color: c })}
                />
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
    </div>
  )
}

function GoalCard({
  goal,
  msInput,
  onMsInput,
  onAddMs,
  onToggleMs,
  onProgress,
  onDelete,
}: {
  goal: Goal
  msInput: string
  onMsInput: (v: string) => void
  onAddMs: () => void
  onToggleMs: (id: string) => void
  onProgress: (p: number) => void
  onDelete: () => void
}) {
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
        <button className="mg-iconbtn danger" onClick={onDelete} aria-label="Delete goal">
          <Icon name="trash" size={15} />
        </button>
      </div>

      {goal.detail && <p className="mg-goal-detail">{goal.detail}</p>}

      {!hasMs && (
        <label className="mg-goal-slider">
          <span>Progress</span>
          <input
            type="range"
            min={0}
            max={100}
            value={goal.progress}
            onChange={(e) => onProgress(Number(e.target.value))}
          />
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
        <input value={msInput} onChange={(e) => onMsInput(e.target.value)} placeholder="Add a milestone…" />
        <button type="submit">
          <Icon name="plus" size={14} />
        </button>
      </form>
    </Panel>
  )
}
