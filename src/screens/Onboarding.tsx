import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Canvas } from '@react-three/fiber'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useAvatar } from '../avatar/store'
import { SKINS, type AvatarConfig } from '../avatar/config'
import { CharacterAvatar } from '../avatar/CharacterAvatar'
import { COUNTRIES } from '../lib/countries'
import { REFERRAL_OPTIONS, type ReferralOption } from '../lib/onboarding'
import { getRank, DEFAULT_RANK_ID } from '../lib/ranks'
import { generatePlayerId } from '../lib/playerId'
import { checkDisplayName } from '../lib/displayName'
import { Flag } from '../components/Flag'
import { RankBadge } from '../components/RankBadge'
import { StudyGoalsSelector } from '../components/StudyGoalsSelector'
import { SparklesText } from '../components/SparklesText'
import './Onboarding.css'

/* ------------------------------------------------------------------ magical particles */

function MagicalParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animFrame: number
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = []
    
    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '#ffd700' : '#ff9500',
      })
    }
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.alpha -= 0.002
        
        if (p.alpha <= 0 || p.y < -10) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + 10
          p.alpha = Math.random() * 0.5 + 0.2
        }
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        
        // Glow effect
        ctx.shadowBlur = 10
        ctx.shadowColor = p.color
      })
      
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      animFrame = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrame)
    }
  }, [])
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}

type StepId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
const LAST_STEP: StepId = 7
const STEP_COUNT = 8

export function Onboarding() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const complete = useProfile((s) => s.complete)
  const setPlayerId = useProfile((s) => s.setPlayerId)

  const [step, setStep] = useState<StepId>(0)
  const [fullName, setFullName] = useState('')
  const [fullNameOk, setFullNameOk] = useState(false)
  const [country, setCountry] = useState<string | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [characterId, setCharacterId] = useState<string>('james')
  const [skinId, setSkinId] = useState<string>('light')
  const [goals, setGoals] = useState<string[]>([])
  const [referral, setReferral] = useState<ReferralOption | null>(null)
  const [referralOther, setReferralOther] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayName = user?.profile?.name || user?.email?.split('@')[0] || t('onboarding.explorerLabel')

  // Per-step gating for the Continue button.
  const canAdvance =
    step === 0 ? true
    : step === 1 ? fullNameOk
    : step === 2 ? !!country
    : step === 3 ? !!age
    : step === 4 ? !!characterId
    : step === 5 ? goals.length > 0
    : step === 6 ? termsAccepted
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
    // Assign a unique numeric Player ID (the shareable, searchable identity key).
    const pid = generatePlayerId()
    const idOk = await setPlayerId(pid)
    if (!idOk) {
      // Extremely unlikely collision — retry once with a fresh ID.
      const retry = await setPlayerId(generatePlayerId())
      if (!retry) {
        setSaving(false)
        setError(t('onboarding.saveError'))
        return
      }
    }
    // Save the full name as the display name.
    await useProfile.getState().setDisplayName(fullName.trim())

    // Apply chosen character + skin to the avatar store.
    const charFallback = (await import('../avatar/characters')).characterById(characterId).fallback
    useAvatar.getState().set({ ...charFallback, characterId, skin: skinId } as Partial<AvatarConfig>)

    const ok = await complete({
      country,
      age: age,
      studyGoals: goals,
      referral,
      referralOther: referral === 'Other' ? referralOther.trim() : null,
      rank: DEFAULT_RANK_ID,
    })
    setSaving(false)
    if (!ok) setError(t('onboarding.saveError'))
    // On success, useProfile.onboarded flips true and App swaps to the lobby.
  }

  return (
    <div className="ob-root">
      {/* Magical floating particles */}
      <MagicalParticles />
      
      {/* Decorative vines on fullscreen bg */}
      <div className="ob-vines">
        {/* Top-left vine */}
        <svg className="ob-vine ob-vine-tl" viewBox="0 0 200 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 0 C10 80, 60 100, 40 180 S-10 300, 30 400 S70 460, 50 500" stroke="var(--accent-dark, #6b7c3a)" strokeWidth="2" fill="none" opacity="0.35"/>
          <ellipse cx="38" cy="60" rx="12" ry="8" transform="rotate(-30 38 60)" fill="var(--accent-dark, #6b7c3a)" opacity="0.25"/>
          <ellipse cx="22" cy="110" rx="10" ry="6" transform="rotate(20 22 110)" fill="var(--accent-dark, #6b7c3a)" opacity="0.22"/>
          <ellipse cx="50" cy="170" rx="11" ry="7" transform="rotate(-25 50 170)" fill="var(--accent-dark, #6b7c3a)" opacity="0.20"/>
          <ellipse cx="18" cy="230" rx="9" ry="5.5" transform="rotate(15 18 230)" fill="var(--accent-dark, #6b7c3a)" opacity="0.18"/>
          <ellipse cx="42" cy="290" rx="10" ry="6" transform="rotate(-20 42 290)" fill="var(--accent-dark, #6b7c3a)" opacity="0.16"/>
          <ellipse cx="25" cy="350" rx="8" ry="5" transform="rotate(25 25 350)" fill="var(--accent-dark, #6b7c3a)" opacity="0.14"/>
          <ellipse cx="48" cy="410" rx="9" ry="5.5" transform="rotate(-18 48 410)" fill="var(--accent-dark, #6b7c3a)" opacity="0.12"/>
        </svg>
        {/* Top-right vine */}
        <svg className="ob-vine ob-vine-tr" viewBox="0 0 200 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M190 0 C190 80, 140 100, 160 180 S210 300, 170 400 S130 460, 150 500" stroke="var(--accent-dark, #6b7c3a)" strokeWidth="2" fill="none" opacity="0.35"/>
          <ellipse cx="162" cy="60" rx="12" ry="8" transform="rotate(30 162 60)" fill="var(--accent-dark, #6b7c3a)" opacity="0.25"/>
          <ellipse cx="178" cy="110" rx="10" ry="6" transform="rotate(-20 178 110)" fill="var(--accent-dark, #6b7c3a)" opacity="0.22"/>
          <ellipse cx="150" cy="170" rx="11" ry="7" transform="rotate(25 150 170)" fill="var(--accent-dark, #6b7c3a)" opacity="0.20"/>
          <ellipse cx="182" cy="230" rx="9" ry="5.5" transform="rotate(-15 182 230)" fill="var(--accent-dark, #6b7c3a)" opacity="0.18"/>
          <ellipse cx="158" cy="290" rx="10" ry="6" transform="rotate(20 158 290)" fill="var(--accent-dark, #6b7c3a)" opacity="0.16"/>
          <ellipse cx="175" cy="350" rx="8" ry="5" transform="rotate(-25 175 350)" fill="var(--accent-dark, #6b7c3a)" opacity="0.14"/>
          <ellipse cx="152" cy="410" rx="9" ry="5.5" transform="rotate(18 152 410)" fill="var(--accent-dark, #6b7c3a)" opacity="0.12"/>
        </svg>
      </div>

      <div className={`ob-card sf-panel${step === 4 ? ' ob-card--wide' : ''}`}>
        <ProgressDots step={step} />

         <div className="ob-body" key={step}>
           {step === 0 && <WelcomeStep />}
           {step === 1 && (
             <FullNameStep
               value={fullName}
               onChange={setFullName}
               onValidity={setFullNameOk}
             />
           )}
           {step === 2 && <CountryStep value={country} onChange={setCountry} />}
           {step === 3 && <AgeStep value={age} onChange={setAge} />}
           {step === 4 && (
             <CharacterStep
               characterId={characterId}
               onCharacter={setCharacterId}
               skinId={skinId}
               onSkin={setSkinId}
             />
           )}
           {step === 5 && <StudyGoalsSelector value={goals} onChange={setGoals} />}
           {step === 6 && (
              <TermsStep
                accepted={termsAccepted}
                onChange={setTermsAccepted}
                referral={referral}
                referralOther={referralOther}
                onReferral={setReferral}
                onReferralOther={setReferralOther}
              />
            )}
            {step === 7 && (
             <FinishStep
               name={fullName || displayName}
               country={country}
               goals={goals}
             />
           )}
         </div>

        {error && <p className="ob-error">{error}</p>}

        <div className="ob-actions">
          {step > 0 && (
            <button className="ob-back-btn" onClick={back} disabled={saving} type="button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
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
      )).reduce((acc: React.ReactNode[], dot, i) => {
        if (i > 0) {
          acc.push(
            <span
              key={`c${i}`}
              className={`ob-dot-connector ${i <= step ? 'done' : ''}`}
            />
          );
        }
        acc.push(dot);
        return acc;
      }, [])}
    </div>
  )
}

/* --------------------------------------------------------------- step 1: welcome */

function WelcomeStep() {
  const { t } = useTranslation()
  return (
    <div className="ob-welcome">
      <div className="ob-logo">
        <img src="/icons/focus-lily-logo.png" alt="FocusLily" />
      </div>
      <h1 className="ob-title">{t('onboarding.welcomeTitle')}</h1>
      <p className="ob-lead">
        {t('onboarding.welcomeBody')}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------- step 2: full name */

function FullNameStep({
  value,
  onChange,
  onValidity,
}: {
  value: string
  onChange: (s: string) => void
  onValidity: (ok: boolean) => void
}) {
  const { t } = useTranslation()

  // Validate inline and report via callback — no setState in effect needed.
  const trimmed = value.trim()
  let valid = false

  if (!trimmed) {
    valid = false
  } else {
    const check = checkDisplayName(trimmed)
    valid = check.ok
  }

  const errorMsg = !trimmed
    ? ''
    : checkDisplayName(trimmed).error || ''

  // Report validity on every render (safe — no cascading setState).
  useEffect(() => {
    onValidity(valid)
  }, [valid, onValidity])

  return (
    <div className="ob-step">
      <h2 className="ob-q">{t('onboarding.fullNameTitle')}</h2>
      <p className="ob-hint">Letters, numbers and _ only. Use _ instead of spaces. Max 20 characters.</p>
      <input
        className="sf-input ob-username-input"
        value={value}
        maxLength={20}
        placeholder="e.g. john_smith"
        autoFocus
        onChange={(e) => {
          const v = e.target.value
          if (/^[a-zA-Z0-9_]*$/.test(v)) onChange(v)
        }}
      />
      {errorMsg && <p className="ob-username-status bad">{errorMsg}</p>}
      {!errorMsg && valid && (
        <p className="ob-username-status ok">{trimmed}</p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- step 3: country */

function CountryStep({ value, onChange }: { value: string | null; onChange: (c: string) => void }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!value) { setMarker(null); return }
    let cancelled = false
    fetch(`https://restcountries.com/v3.1/alpha/${value}?fields=latlng`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !Array.isArray(d) || !d[0]?.latlng) return
        const [lat, lng] = d[0].latlng
        setMarker({ lat, lng })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [value])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return COUNTRIES
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(needle) || c.code.toLowerCase() === needle)
  }, [q])

  return (
    <div className="ob-step">
      <h2 className="ob-q">{t('onboarding.countryTitle')}</h2>
      <p className="ob-hint">{t('onboarding.countryHint')}</p>
      <input
        className="sf-input ob-search"
        placeholder={t('common.searchCountries')}
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
        {results.length === 0 && <p className="ob-empty">{t('common.noCountriesMatch', { query: q })}</p>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- step 3: birthdate */

function AgeStep({ value, onChange }: { value: number | null; onChange: (age: number) => void }) {
  const { t } = useTranslation()
  const [input, setInput] = useState(value?.toString() ?? '')

  const handleInput = (v: string) => {
    // Only allow digits
    const digits = v.replace(/\D/g, '').slice(0, 3)
    setInput(digits)
    const num = parseInt(digits, 10)
    if (digits && num >= 7 && num <= 100) {
      onChange(num)
    }
  }

return (
     <div className="ob-step">
       <h2 className="ob-q">{t('onboarding.ageTitle')}</h2>
       <div className="ob-age-row">
         <button
           className="ob-stepper"
           onClick={() => {
             const next = Math.max(7, (value ?? 18) - 1)
             setInput(next.toString())
             onChange(next)
           }}
           type="button"
           aria-label="Decrease age"
         >
           −
         </button>
         <input
           type="text"
           className="sf-input ob-age-input"
           value={input}
           onChange={(e) => handleInput(e.target.value)}
           placeholder="—"
           autoFocus
           inputMode="numeric"
           maxLength={3}
         />
         <button
           className="ob-stepper"
           onClick={() => {
             const next = Math.min(100, (value ?? 18) + 1)
             setInput(next.toString())
             onChange(next)
           }}
           type="button"
           aria-label="Increase age"
         >
           +
         </button>
       </div>
      {value && (value < 7 || value > 100) && (
        <p className="ob-username-status bad">Age must be between 7 and 100</p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- step 4: character + skin */

interface CharacterOption {
  id: string
  name: string
  fallback: AvatarConfig
}

const PICK_CHARACTERS: CharacterOption[] = [
  { id: 'james', name: 'James', fallback: { characterId: 'james', bodyType: 'male', skin: 'light', hair: 'short_neat', hairColor: 'brown', top: 'jacket', bottom: 'pants', shoes: 'sneakers' } as AvatarConfig },
  { id: 'claire', name: 'Lily', fallback: { characterId: 'claire', bodyType: 'female', skin: 'light', hair: 'ponytail', hairColor: 'chestnut', top: 'frock', bottom: 'leggings', shoes: 'sneakers' } as AvatarConfig },
  { id: 'mia', name: 'Mia', fallback: { characterId: 'mia', bodyType: 'female', skin: 'tan', hair: 'long_straight', hairColor: 'auburn', top: 'blazer', bottom: 'leggings', shoes: 'boots' } as AvatarConfig },
]

function CharPreview3D({ config, skinId }: { config: AvatarConfig; skinId?: string }) {
  const merged = useMemo(
    () => (skinId ? { ...config, skin: skinId } : config),
    [config, skinId],
  )
  return (
    <div className="ob-char-3d">
      <Canvas
        shadows={false}
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.05, 3.2], fov: 34, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <hemisphereLight args={['#ffe8c0', '#1a1208', 0.7]} />
        <directionalLight position={[3, 5, 2]} intensity={1.0} color="#ffecd0" />
        <directionalLight position={[-2, 3, -1]} intensity={0.35} color="#ffb870" />
        <ambientLight intensity={0.25} color="#ffe8d0" />
        <group position={[0, -0.85, 0]}>
          <CharacterAvatar config={merged} hideAccessories />
        </group>
      </Canvas>
    </div>
  )
}

const SKIN_OPTIONS = SKINS.map((s) => ({ id: s.id, name: s.name, hex: s.hex }))

function CharacterStep({
  characterId,
  onCharacter,
  skinId,
  onSkin,
}: {
  characterId: string
  onCharacter: (id: string) => void
  skinId: string
  onSkin: (id: string) => void
}) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, scrollLeft: 0 })

  function handleMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return
    setDragging(true)
    dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft }
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging || !scrollRef.current) return
    const dx = e.clientX - dragStart.current.x
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx
  }
  function handleMouseUp() { setDragging(false) }

  return (
    <div className="ob-step">
      <h2 className="ob-q">Choose your character</h2>
      <p className="ob-hint">Swipe to browse. You can customize more later.</p>

      {/* Horizontal swipeable character cards */}
      <div
        className="ob-char-scroll"
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {PICK_CHARACTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`ob-char-card ${characterId === c.id ? 'selected' : ''}`}
            onClick={() => onCharacter(c.id)}
          >
            <CharPreview3D config={c.fallback} skinId={characterId === c.id ? skinId : undefined} />
            <span className="ob-char-name">{c.name}</span>
            {characterId === c.id && <span className="ob-char-check">✓</span>}
          </button>
        ))}
      </div>

      {/* Skin color swatches */}
      <div className="ob-skin-row">
        <span className="ob-skin-label">Skin tone</span>
        <div className="ob-skin-swatches">
          {SKIN_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`ob-swatch ${skinId === s.id ? 'on' : ''}`}
              style={{ background: s.hex }}
              onClick={() => onSkin(s.id)}
              aria-label={s.name}
              title={s.name}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- step 5: terms + referral */

function TermsStep({
  accepted,
  onChange,
  referral,
  referralOther,
  onReferral,
  onReferralOther,
}: {
  accepted: boolean
  onChange: (v: boolean) => void
  referral: ReferralOption | null
  referralOther: string
  onReferral: (r: ReferralOption) => void
  onReferralOther: (s: string) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="ob-step ob-terms">
      <h2 className="ob-q">{t('onboarding.referralTitle')}</h2>

      {/* Referral question */}
      <div className="ob-referrals">
        {REFERRAL_OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`ob-chip wide ${referral === opt ? 'on' : ''}`}
            onClick={() => onReferral(opt)}
            type="button"
            aria-pressed={referral === opt}
          >
            {opt}
          </button>
        ))}
      </div>
      {referral === 'Other' && (
        <input
          className="sf-input ob-search"
          placeholder={t('onboarding.referralPlaceholder')}
          value={referralOther}
          onChange={(e) => onReferralOther(e.target.value)}
          autoFocus
          maxLength={80}
        />
      )}

      {/* Collapsible terms */}
      <button
        className="ob-terms-toggle"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <svg className={`ob-terms-arrow ${expanded ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        {t('onboarding.termsRead')}
      </button>

      {expanded && (
        <div className="ob-terms-scroll">
          <div className="ob-terms-content">
            <h3>Terms &amp; Conditions</h3>
            <p>By using FocusLily, you agree to these Terms. If you do not agree, you must stop using the service.</p>
            <p><strong>Eligibility:</strong> FocusLily is intended for users aged 7 years and above.</p>
            <p>Accounts are created using Google, Microsoft, or GitHub authentication. Users are responsible for maintaining the security of their accounts.</p>
            <p>Users may create a username, provide an email address, and optionally upload a profile picture. No additional personal data is required.</p>
            <p>FocusLily provides access to public competitions and private rooms. Certain rooms or features may require viewing an advertisement to unlock access, limited to once every 24 hours per room.</p>
            <p>FocusLily includes gamification features such as XP, rankings, and competition systems. Scores, rankings, and results are system-generated and may be adjusted in cases of abuse, cheating, or technical errors.</p>
            <p>AI-based features may be introduced in the future and will be governed by updated terms at that time.</p>
            <p>Users must not abuse, exploit, hack, or interfere with FocusLily systems, including competitions, XP systems, or room access mechanisms.</p>
            <p>FocusLily may suspend or terminate access to users who violate these Terms.</p>

            <h3>Privacy Policy</h3>
            <p>FocusLily collects only the following information: username, email address, and optional profile picture.</p>
            <p>FocusLily does not intentionally collect IP addresses, cookies, or device tracking data.</p>
            <p>User data is used only for authentication, account management, and enabling core platform features such as competitions and rooms.</p>
            <p>FocusLily does not sell user data.</p>
            <p>Third-party services such as Vercel, GitHub, and authentication providers may process limited data necessary for login and service operation.</p>

            <h3>Cookie Policy</h3>
            <p>FocusLily does not use cookies for tracking or advertising purposes.</p>

            <h3>Community Guidelines</h3>
            <p>Users must behave respectfully within all areas of FocusLily.</p>
            <p>Cheating, exploiting bugs, automation, or disrupting platform systems is not allowed.</p>
            <p>Abusive, offensive, or inappropriate usernames and behavior may result in restrictions or removal of access.</p>

            <h3>Competition Rules</h3>
            <p>All competitions must be played fairly.</p>
            <p>Any attempt to exploit bugs, manipulate results, or gain unfair advantage will result in disqualification.</p>
            <p>XP, rankings, and rewards are assigned based on system logic and may be corrected in case of errors.</p>
            <p>All moderation and final decisions are made by FocusLily administrators.</p>

            <h3>Acceptable Use Policy</h3>
            <p>Users must not reverse engineer, attack, overload, spam, or misuse FocusLily systems.</p>
            <p>Users must not attempt to manipulate ads, XP systems, competition results, or room access rules.</p>

            <h3>Copyright Policy</h3>
            <p>If you believe any content on FocusLily violates your copyright, you may report it by contacting: <strong>support@focuslily.com</strong></p>
            <p>Valid reports will be reviewed and appropriate action may be taken.</p>

            <h3>Disclaimer</h3>
            <p>FocusLily is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.</p>
            <p>No guarantees are made regarding uptime, availability, accuracy, or error-free performance of the platform.</p>

            <h3>Governing Law</h3>
            <p>These Terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of Indian courts.</p>

            <h3>Sign-in Notice</h3>
            <p>By signing in using Google, Microsoft, or GitHub, you agree to these Terms and the Privacy Policy.</p>

            <p className="ob-terms-footer">&copy; FocusLily. All rights reserved.<br/>Use of this platform is subject to Terms and Privacy Policy.</p>
          </div>
        </div>
      )}

      <label className="ob-terms-check" htmlFor="ob-terms">
        <input
          id="ob-terms"
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          className="ob-terms-checkbox"
        />
        <span className="ob-terms-checkmark" />
        <span className="ob-terms-label">{t('onboarding.termsAccept')}</span>
      </label>
    </div>
  )
}

/* ---------------------------------------------------------------- step 7: finish */

function FinishStep({
  name,
  country,
  goals,
}: {
  name: string
  country: string | null
  goals: string[]
}) {
  const { t } = useTranslation()
  const rank = getRank(DEFAULT_RANK_ID)
  const countryObj = COUNTRIES.find((c) => c.code === country)
  return (
    <div className="ob-step ob-finish">
      <h1 className="ob-title">
        <SparklesText>{t('onboarding.profileReady')}</SparklesText>
      </h1>
      <div className="ob-finish-badge">
        <RankBadge rankId={rank.id} size={120} />
        <p className="ob-finish-rank">
          {t('onboarding.startingRank')}: <strong>{rank.name}</strong>
        </p>
      </div>

      <div className="ob-summary">
        <div className="ob-summary-row">
          <span className="ob-summary-k">Name</span>
          <span className="ob-summary-v">
            {country && <Flag code={country} />} {name}
          </span>
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
      <p className="ob-hint" style={{ marginTop: 12, textAlign: 'center' }}>
        Your unique username will be shown on your profile. You can share it with friends!
      </p>
    </div>
  )
}
