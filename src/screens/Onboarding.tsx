import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { COUNTRIES } from '../lib/countries'
import { STUDY_GOAL_GROUPS } from '../lib/studyGoals'
import { REFERRAL_OPTIONS, MIN_AGE, MAX_AGE, type ReferralOption } from '../lib/onboarding'
import { getRank, DEFAULT_RANK_ID } from '../lib/ranks'
import { checkUsername, suggestUsername, type UsernameCheck } from '../lib/usernames'
import { Flag } from '../components/Flag'
import { RankBadge } from '../components/RankBadge'
import './Onboarding.css'

type StepId = 0 | 1 | 2 | 3 | 4 | 5 | 6
const LAST_STEP: StepId = 6
const STEP_COUNT = 7

export function Onboarding() {
  const { user } = useAuth()
  const complete = useProfile((s) => s.complete)
  const setUsername = useProfile((s) => s.setUsername)

  const [step, setStep] = useState<StepId>(0)
  const [username, setUsernameDraft] = useState('')
  const [usernameOk, setUsernameOk] = useState(false)
  const [country, setCountry] = useState<string | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [goals, setGoals] = useState<string[]>([])
  const [referral, setReferral] = useState<ReferralOption | null>(null)
  const [referralOther, setReferralOther] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayName = user?.profile?.name || user?.email?.split('@')[0] || 'Explorer'

  // Per-step gating for the Continue button.
  const canAdvance =
    step === 0 ? true
    : step === 1 ? usernameOk
    : step === 2 ? !!country
    : step === 3 ? age != null
    : step === 4 ? goals.length > 0
    : step === 5 ? !!referral && (referral !== 'Other' || referralOther.trim().length > 0)
    : true

  function next() {
    setError(null)
    if (step < LAST_STEP) setStep((s) => (s + 1) as StepId)
  }
  function back() {
    setError(null)
    if (step > 0) setStep((s) => (s - 1) as StepId)
  }

  async function finish() {
    setSaving(true)
    setError(null)
    // Claim the unique username first; on a race (taken) bounce back to step 1.
    const claimed = await setUsername(username)
    if (!claimed) {
      setSaving(false)
      setUsernameOk(false)
      setStep(1)
      setError('That username was just taken — please pick another.')
      return
    }
    const ok = await complete({
      country,
      age,
      studyGoals: goals,
      referral,
      referralOther: referral === 'Other' ? referralOther.trim() : null,
      rank: DEFAULT_RANK_ID,
    })
    setSaving(false)
    if (!ok) setError("We couldn't save your profile. Check your connection and try again.")
    // On success, useProfile.onboarded flips true and App swaps to the lobby.
  }

  return (
    <div className="ob-root">
      <div className="ob-card sf-panel">
        <ProgressDots step={step} />

        <div className="ob-body" key={step}>
          {step === 0 && <WelcomeStep />}
          {step === 1 && (
            <UsernameStep
              value={username}
              seed={displayName}
              onChange={setUsernameDraft}
              onValidity={setUsernameOk}
            />
          )}
          {step === 2 && <CountryStep value={country} onChange={setCountry} />}
          {step === 3 && <AgeStep value={age} onChange={setAge} />}
          {step === 4 && <GoalsStep value={goals} onChange={setGoals} />}
          {step === 5 && (
            <ReferralStep
              value={referral}
              other={referralOther}
              onChange={setReferral}
              onOther={setReferralOther}
            />
          )}
          {step === 6 && (
            <FinishStep
              name={displayName}
              username={username}
              country={country}
              goals={goals}
            />
          )}
        </div>

        {error && <p className="ob-error">{error}</p>}

        <div className="ob-actions">
          {step > 0 && (
            <button className="sf-btn secondary" onClick={back} disabled={saving} type="button">
              Back
            </button>
          )}
          {step < LAST_STEP ? (
            <button className="sf-btn ob-primary" onClick={next} disabled={!canAdvance} type="button">
              Continue
            </button>
          ) : (
            <button className="sf-btn ob-primary" onClick={finish} disabled={saving} type="button">
              {saving ? 'Setting up…' : 'Enter FocusLily'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressDots({ step }: { step: StepId }) {
  return (
    <div className="ob-progress" aria-hidden>
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <span key={i} className={`ob-dot ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} />
      ))}
    </div>
  )
}

/* --------------------------------------------------------------- step 1: welcome */

function WelcomeStep() {
  return (
    <div className="ob-welcome">
      <div className="ob-seedling">🌱</div>
      <h1 className="ob-title">Welcome to FocusLily</h1>
      <p className="ob-lead">
        Let&rsquo;s set up your profile. This information helps personalize your experience.
        Sensitive information such as age will never be displayed publicly.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------- step 2: username */

function UsernameStep({
  value,
  seed,
  onChange,
  onValidity,
}: {
  value: string
  seed: string
  onChange: (s: string) => void
  onValidity: (ok: boolean) => void
}) {
  const [status, setStatus] = useState<UsernameCheck & { checking?: boolean }>({ ok: false })

  // Suggest an available handle from the display name on first mount (once).
  useEffect(() => {
    if (value) return
    let cancelled = false
    void suggestUsername(seed).then((s) => {
      if (!cancelled && s) onChange(s)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced live availability check whenever the draft changes. All state
  // updates run inside the timer callback (no synchronous setState in effect).
  useEffect(() => {
    let active = true
    const t = window.setTimeout(async () => {
      if (!value) {
        if (active) {
          setStatus({ ok: false })
          onValidity(false)
        }
        return
      }
      if (active) setStatus({ ok: false, checking: true })
      const res = await checkUsername(value)
      if (active) {
        setStatus({ ...res, checking: false })
        onValidity(res.ok)
      }
    }, value ? 400 : 0)
    return () => {
      active = false
      window.clearTimeout(t)
    }
  }, [value, onValidity])

  return (
    <div className="ob-step">
      <h2 className="ob-q">Choose your username</h2>
      <p className="ob-hint">
        Your unique handle for mentions, your profile link and friend requests. Letters, numbers and _
        only — it can&rsquo;t be changed often, but your display name can be anything.
      </p>
      <div className="ob-username">
        <span className="ob-username-at">@</span>
        <input
          className="sf-input ob-username-input"
          value={value}
          maxLength={20}
          placeholder="username"
          autoFocus
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        />
      </div>
      <p className={`ob-username-status ${status.checking ? '' : status.ok ? 'ok' : value ? 'bad' : ''}`}>
        {status.checking
          ? 'Checking availability…'
          : status.ok
            ? `@${value} is available`
            : value
              ? status.error
              : ''}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------- step 3: country */

function CountryStep({ value, onChange }: { value: string | null; onChange: (c: string) => void }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return COUNTRIES
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase() === needle)
  }, [q])

  return (
    <div className="ob-step">
      <h2 className="ob-q">Which country are you from?</h2>
      <p className="ob-hint">Shown publicly beside your name and rank.</p>
      <input
        className="sf-input ob-search"
        placeholder="Search countries…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      <div className="ob-country-list" role="listbox" aria-label="Countries">
        {results.map((c) => (
          <button
            key={c.code}
            role="option"
            aria-selected={value === c.code}
            className={`ob-country ${value === c.code ? 'on' : ''}`}
            onClick={() => onChange(c.code)}
            type="button"
          >
            <Flag code={c.code} />
            <span className="ob-country-name">{c.name}</span>
            {value === c.code && <span className="ob-check">✓</span>}
          </button>
        ))}
        {results.length === 0 && <p className="ob-empty">No countries match “{q}”.</p>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ step 3: age */

function AgeStep({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="ob-step">
      <h2 className="ob-q">How old are you?</h2>
      <div className="ob-private-notice">
        <span className="ob-lock">🔒</span>
        <span>
          Your age is private and will never be shown publicly to other users. It is only used to
          personalize your experience.
        </span>
      </div>
      <div className="ob-age">
        <button
          className="ob-stepper"
          type="button"
          onClick={() => onChange(Math.max(MIN_AGE, (value ?? MIN_AGE) - 1))}
          aria-label="Decrease age"
        >
          −
        </button>
        <div className="ob-age-value">
          <input
            type="number"
            className="ob-age-input"
            min={MIN_AGE}
            max={MAX_AGE}
            value={value ?? ''}
            placeholder="—"
            onChange={(e) => {
              const n = Number(e.target.value)
              if (!Number.isNaN(n)) onChange(Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(n))))
            }}
          />
          <span className="ob-age-label">years</span>
        </div>
        <button
          className="ob-stepper"
          type="button"
          onClick={() => onChange(Math.min(MAX_AGE, (value ?? MIN_AGE) + 1))}
          aria-label="Increase age"
        >
          +
        </button>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- step 4: study goals */

function GoalsStep({ value, onChange }: { value: string[]; onChange: (g: string[]) => void }) {
  const [q, setQ] = useState('')
  const sel = new Set(value)
  const toggle = (id: string) =>
    onChange(sel.has(id) ? value.filter((g) => g !== id) : [...value, id])

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return STUDY_GOAL_GROUPS
    return STUDY_GOAL_GROUPS.map((g) => ({
      ...g,
      goals: g.goals.filter((x) => x.label.toLowerCase().includes(needle)),
    })).filter((g) => g.goals.length > 0)
  }, [q])

  return (
    <div className="ob-step">
      <h2 className="ob-q">What are you currently studying for?</h2>
      <p className="ob-hint">Pick all that apply — we use these to tailor rooms and recommendations.</p>
      <input
        className="sf-input ob-search"
        placeholder="Search exams, classes, goals…"
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
                  className={`ob-chip ${sel.has(goal.id) ? 'on' : ''}`}
                  onClick={() => toggle(goal.id)}
                  type="button"
                  aria-pressed={sel.has(goal.id)}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="ob-empty">No goals match “{q}”.</p>}
      </div>
      {value.length > 0 && <p className="ob-selected-count">{value.length} selected</p>}
    </div>
  )
}

/* -------------------------------------------------------------- step 5: referral */

function ReferralStep({
  value,
  other,
  onChange,
  onOther,
}: {
  value: ReferralOption | null
  other: string
  onChange: (r: ReferralOption) => void
  onOther: (s: string) => void
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-q">How did you discover FocusLily?</h2>
      <div className="ob-referrals">
        {REFERRAL_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`ob-chip wide ${value === opt ? 'on' : ''}`}
            onClick={() => onChange(opt)}
            type="button"
            aria-pressed={value === opt}
          >
            {opt}
          </button>
        ))}
      </div>
      {value === 'Other' && (
        <input
          className="sf-input ob-search"
          placeholder="Tell us where…"
          value={other}
          onChange={(e) => onOther(e.target.value)}
          autoFocus
          maxLength={80}
        />
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- step 6: finish */

function FinishStep({
  name,
  username,
  country,
  goals,
}: {
  name: string
  username: string
  country: string | null
  goals: string[]
}) {
  const rank = getRank(DEFAULT_RANK_ID)
  const countryObj = COUNTRIES.find((c) => c.code === country)
  return (
    <div className="ob-step ob-finish">
      <h1 className="ob-title">Your FocusLily profile is ready</h1>
      <div className="ob-finish-badge">
        <RankBadge rankId={rank.id} size={120} />
        <p className="ob-finish-rank">
          Starting Rank: <strong>{rank.name}</strong>
        </p>
      </div>

      <div className="ob-summary">
        <div className="ob-summary-row">
          <span className="ob-summary-k">Explorer</span>
          <span className="ob-summary-v">
            {country && <Flag code={country} />} {name}
          </span>
        </div>
        <div className="ob-summary-row">
          <span className="ob-summary-k">Username</span>
          <span className="ob-summary-v">@{username}</span>
        </div>
        <div className="ob-summary-row">
          <span className="ob-summary-k">Country</span>
          <span className="ob-summary-v">{countryObj ? countryObj.name : '—'}</span>
        </div>
        <div className="ob-summary-row">
          <span className="ob-summary-k">Study goal(s)</span>
          <span className="ob-summary-v">{goals.length ? `${goals.length} chosen` : '—'}</span>
        </div>
      </div>
    </div>
  )
}
