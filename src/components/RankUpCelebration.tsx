import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { RANKS, rankForLifetime } from '../lib/ranks'
import type { Rank } from '../lib/ranks'
import './RankUpCelebration.css'

// ---------------------------------------------------------------------------
// Rank-up celebration — a Free Fire–style ceremony that plays ONCE when the
// player reaches a new rank, and only while this component is mounted (the
// Lobby). Rank-ups earned mid-focus-session are never shown instantly: the
// next time the player visits the lobby the ceremony plays and then marks the
// new rank as "celebrated" in localStorage, so it never repeats.
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'sf.rankup.celebrated'

function writeCelebrated(userId: string, idx: number) {
  try {
    localStorage.setItem(`${KEY_PREFIX}.${userId}`, String(idx))
  } catch {
    /* storage blocked — the ceremony may replay once, acceptable */
  }
}

/**
 * Decide whether a ceremony should play for the current rank. The first visit
 * with this feature seeds the tracker to the current rank so long-time players
 * don't get a surprise ceremony for a rank they earned months ago.
 */
function computeCelebration(userId: string, rank: Rank, rankIdx: number): Celebration | null {
  let celebrated: number
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}.${userId}`)
    if (raw === null) {
      localStorage.setItem(`${KEY_PREFIX}.${userId}`, String(rankIdx))
      return null
    }
    const n = Number(raw)
    celebrated = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  } catch {
    celebrated = 0
  }
  if (rankIdx <= celebrated) return null
  return {
    fromRank: RANKS[Math.max(0, celebrated)],
    toRank: rank,
    jumps: rankIdx - celebrated,
    key: `${userId}:${rank.id}:${Date.now()}`,
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

interface Celebration {
  fromRank: Rank
  toRank: Rank
  jumps: number
  /** unique per trigger — regenerates particles */
  key: string
}

// ---- particle generators ---------------------------------------------------
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

interface Spark {
  left: string
  top: string
  tx: string
  ty: string
  rot: string
  size: number
  color: string
  delay: string
  dur: string
}

const SPARK_COLORS = ['#ffd873', '#fff3c4', '#ffb347', '#ffe08a', '#ff9a3c']

function generateSparks(seed?: string): Spark[] {
  if (!seed) return []
  const n = 30
  const arr: Spark[] = []
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rand(-0.25, 0.25)
    const dist = rand(90, 260)
    arr.push({
      left: '50%',
      top: '40%',
      tx: `${Math.round(Math.cos(ang) * dist)}px`,
      ty: `${Math.round(Math.sin(ang) * dist)}px`,
      rot: `${Math.round(rand(90, 540))}deg`,
      size: rand(4, 10),
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      delay: `${rand(0.9, 1.5).toFixed(2)}s`,
      dur: `${rand(0.7, 1.3).toFixed(2)}s`,
    })
  }
  return arr
}

const CONFETTI_COLORS = ['#ffd873', '#ff6a6a', '#6bd5ff', '#7dff9a', '#caa84a', '#ff9a3c', '#b388ff']

interface Confetti {
  left: string
  w: number
  h: number
  color: string
  rot: string
  sway: string
  delay: string
  dur: string
}

function generateConfetti(seed?: string): Confetti[] {
  if (!seed) return []
  const arr: Confetti[] = []
  for (let i = 0; i < 42; i++) {
    arr.push({
      left: `${rand(0, 100).toFixed(1)}%`,
      w: rand(5, 10),
      h: rand(9, 16),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot: `${Math.round(rand(180, 540))}deg`,
      sway: `${Math.round(rand(-60, 60))}px`,
      delay: `${rand(1.4, 2.6).toFixed(2)}s`,
      dur: `${rand(2.4, 3.8).toFixed(2)}s`,
    })
  }
  return arr
}

interface Ember {
  left: string
  size: number
  color: string
  sway: string
  delay: string
  dur: string
}

function generateEmbers(seed?: string): Ember[] {
  if (!seed) return []
  const arr: Ember[] = []
  for (let i = 0; i < 22; i++) {
    arr.push({
      left: `${rand(4, 96).toFixed(1)}%`,
      size: rand(3, 8),
      color: Math.random() > 0.5 ? '#ff9a3c' : '#ffd873',
      sway: `${Math.round(rand(-50, 50))}px`,
      delay: `${rand(1.2, 2.6).toFixed(2)}s`,
      dur: `${rand(2.6, 4.0).toFixed(2)}s`,
    })
  }
  return arr
}

// ---- synthesized fanfare (no audio assets, best-effort) --------------------
let fanfareCtx: AudioContext | null = null

function playFanfare() {
  try {
    type AudioContextCtor = typeof AudioContext
    const win = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
    const Ctor = win.AudioContext || win.webkitAudioContext
    if (!Ctor) return
    fanfareCtx = fanfareCtx ?? new Ctor()
    const ctx = fanfareCtx
    if (ctx.state === 'suspended') void ctx.resume()

    const now = ctx.currentTime + 0.05
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.2, now + 0.03)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 3.4)
    master.connect(ctx.destination)

    // Low cinematic boom (impact of the badge landing)
    const boom = ctx.createOscillator()
    boom.type = 'sine'
    boom.frequency.setValueAtTime(130, now)
    boom.frequency.exponentialRampToValueAtTime(36, now + 0.55)
    const boomGain = ctx.createGain()
    boomGain.gain.setValueAtTime(0.9, now)
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75)
    boom.connect(boomGain).connect(master)
    boom.start(now)
    boom.stop(now + 0.8)

    // Bright shimmer arpeggio (C5 E5 G5 C6)
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const t = now + 0.3 + i * 0.11
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.detune.value = (Math.random() - 0.5) * 8
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
      osc.connect(g).connect(master)
      osc.start(t)
      osc.stop(t + 1.2)
    })

    // Sparkling noise shimmer layered on top
    const len = Math.floor(ctx.sampleRate * 0.5)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 3200
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.14, now + 0.3)
    ng.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
    noise.connect(hp).connect(ng).connect(master)
    noise.start(now + 0.3)
  } catch {
    /* audio unavailable — visuals still carry the moment */
  }
}

// ---------------------------------------------------------------------------
export function RankUpCelebration() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const rankXp = useProfile((s) => s.rankXp)
  const xp = useProfile((s) => s.xp)
  const premiumXp = useProfile((s) => s.premiumXp)
  const rank = rankForLifetime(rankXp, xp, premiumXp)

  const rankIdx = RANKS.indexOf(rank)
  const reducedMotion = useMemo(() => prefersReducedMotion(), [])

  // Mount-time check (App only renders the lobby after the profile is ready,
  // so rank data is available here). Lazy initializer keeps the trigger
  // effect-free.
  const [active, setActive] = useState<Celebration | null>(() =>
    userId ? computeCelebration(userId, rank, rankIdx) : null,
  )
  const [closing, setClosing] = useState(false)
  const timersRef = useRef<number[]>([])

  // Watch for rank changes while mounted (e.g. XP synced from another tab).
  // setState lives inside the subscription callback — not synchronously in the
  // effect — so it never triggers the cascading-render lint rule.
  useEffect(() => {
    if (!userId) return
    const check = () => {
      const s = useProfile.getState()
      const r = rankForLifetime(s.rankXp, s.xp, s.premiumXp)
      const c = computeCelebration(userId, r, RANKS.indexOf(r))
      if (!c) return
      // Don't restart a ceremony that's already playing for the same rank.
      setClosing(false)
      setActive((prev) => (prev && prev.toRank.id === c.toRank.id ? prev : c))
    }
    const unsub = useProfile.subscribe(check)
    return unsub
  }, [userId])

  // Clear any pending timers on unmount.
  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  const nextRank = active ? (RANKS[RANKS.indexOf(active.toRank) + 1] ?? null) : null
  const progressPct = useMemo(() => {
    if (!active) return 0
    const idx = RANKS.indexOf(active.toRank)
    const next = RANKS[idx + 1]
    if (!next) return 100
    const lifetime = rankXp > 0 ? rankXp : xp + premiumXp
    const span = next.threshold - active.toRank.threshold
    return span > 0 ? Math.max(0, Math.min(100, ((lifetime - active.toRank.threshold) / span) * 100)) : 100
  }, [active, rankXp, xp, premiumXp])

  // Dismiss: mark the rank celebrated, play the fade-out, then unmount.
  const dismiss = useCallback(() => {
    if (!userId) return
    writeCelebrated(userId, rankIdx)
    setClosing(true)
    timersRef.current.push(window.setTimeout(() => setActive(null), 800))
  }, [userId, rankIdx])

  // Auto-dismiss after the full ceremony (~6.6s — covers the particle tail).
  useEffect(() => {
    if (!active) return
    const t = window.setTimeout(dismiss, 6600)
    timersRef.current.push(t)
    return () => clearTimeout(t)
  }, [active, dismiss])

  // Escape also dismisses the ceremony.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, dismiss])

  // Synthesized fanfare (skipped when reduced motion is requested).
  useEffect(() => {
    if (active && !reducedMotion) playFanfare()
  }, [active, reducedMotion])

  const sparks = useMemo(() => generateSparks(active?.key), [active?.key])
  const confetti = useMemo(() => generateConfetti(active?.key), [active?.key])
  const embers = useMemo(() => generateEmbers(active?.key), [active?.key])

  if (!active) return null

  const title = 'RANK UP'

  return (
    <div
      className={`rankup ${closing ? 'rankup--closing' : ''}`}
      style={{ '--rank-accent': active.toRank.accent } as React.CSSProperties}
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`Rank up! You reached ${active.toRank.name}`}
    >
      {/* Cinematic layers */}
      <div className="rankup-vignette" />
      <div className="rankup-flash" />
      <div className="rankup-rays" />
      <div className="rankup-shock rankup-shock--1" />
      <div className="rankup-shock rankup-shock--2" />
      <div className="rankup-shock rankup-shock--3" />

      {/* Particles */}
      <div className="rankup-sparks" aria-hidden>
        {sparks.map((s, i) => (
          <span
            key={i}
            className="rankup-spark"
            style={{
              left: s.left,
              top: s.top,
              '--tx': s.tx,
              '--ty': s.ty,
              '--rot': s.rot,
              '--sz': `${s.size}px`,
              '--color': s.color,
              '--delay': s.delay,
              '--dur': s.dur,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="rankup-confetti" aria-hidden>
        {confetti.map((c, i) => (
          <span
            key={i}
            className="rankup-confetti-piece"
            style={{
              left: c.left,
              '--w': `${c.w}px`,
              '--h': `${c.h}px`,
              '--color': c.color,
              '--rot': c.rot,
              '--sway': c.sway,
              '--delay': c.delay,
              '--dur': c.dur,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="rankup-embers" aria-hidden>
        {embers.map((e, i) => (
          <span
            key={i}
            className="rankup-ember"
            style={{
              left: e.left,
              '--sz': `${e.size}px`,
              '--color': e.color,
              '--sway': e.sway,
              '--delay': e.delay,
              '--dur': e.dur,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Stage */}
      <div className="rankup-stage">
        <div className="rankup-emblem">
          <div className="rankup-emblem-glow" />
          <div className="rankup-emblem-halo" />
          <img src={active.toRank.badge} alt="" className="rankup-badge" draggable={false} />
        </div>

        <div className="rankup-title-shine">
          <div className="rankup-title" aria-hidden>
            {title.split('').map((ch, i) => (
              <span key={i} className="rankup-letter" style={{ '--li': i } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </div>
        </div>

        <div className="rankup-rankname">{active.toRank.name}</div>

        <div className="rankup-from">
          {active.jumps > 1
            ? `Skipped ${active.jumps} ranks — promoted from ${active.fromRank.name}`
            : `Promoted from ${active.fromRank.name}`}
        </div>

        <div className="rankup-progress">
          <div className="rankup-progress-label">
            <span>{nextRank ? `Next: ${nextRank.name}` : 'Highest rank reached'}</span>
            <span>{nextRank ? `${Math.round(progressPct)}%` : 'MAX'}</span>
          </div>
          <div className="rankup-bar">
            <div className="rankup-bar-fill" style={{ '--to': `${progressPct}%` } as React.CSSProperties} />
          </div>
        </div>

        <button
          className="rankup-continue"
          onClick={(e) => {
            e.stopPropagation()
            dismiss()
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
