import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STUDY_GOAL_GROUPS } from '../lib/studyGoals'

const MAX_GOALS = 3

interface StudyGoalsSelectorProps {
  value: string[]
  onChange: (goals: string[]) => void
}

export function StudyGoalsSelector({ value, onChange }: StudyGoalsSelectorProps) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const sel = new Set(value)
  const atLimit = value.length >= MAX_GOALS

  const toggle = (id: string) => {
    if (sel.has(id)) {
      onChange(value.filter((g) => g !== id))
    } else if (!atLimit) {
      onChange([...value, id])
    }
  }

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return STUDY_GOAL_GROUPS
    return STUDY_GOAL_GROUPS.map((g) => ({
      ...g,
      goals: g.goals.filter((x) => x.label.toLowerCase().includes(needle)),
    })).filter((g) => g.goals.length > 0)
  }, [q])

  return (
    <div className="study-goals-selector">
      <p className="ob-hint">{t('onboarding.goalsHint')}</p>
      <input
        className="sf-input ob-search"
        placeholder={t('onboarding.goalsSearch')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="ob-goals">
        {groups.map((g) => (
          <div key={g.id} className="ob-goal-group">
            <h3 className="ob-goal-title">{g.title}</h3>
            <div className="ob-goal-chips">
              {g.goals.map((goal) => (
                <button
                  key={goal.id}
                  className={`ob-chip ${sel.has(goal.id) ? 'on' : ''} ${atLimit && !sel.has(goal.id) ? 'ob-chip-disabled' : ''}`}
                  onClick={() => toggle(goal.id)}
                  type="button"
                  aria-pressed={sel.has(goal.id)}
                  disabled={atLimit && !sel.has(goal.id)}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="ob-empty">No goals match "{q}".</p>}
      </div>
      <p className="ob-selected-count">
        {t('onboarding.selected', { count: value.length })} / {MAX_GOALS}
        {atLimit && <span className="ob-max-hint"> — max reached</span>}
      </p>
    </div>
  )
}
