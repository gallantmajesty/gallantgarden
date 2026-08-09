// CoC-style achievements list for the Profile tab. Systematic vertical rows —
// icon, title, progress bar and a Claim button — instead of a grid of boxes.
// Own profile shows live progress + Claim; public profiles show earned badges.

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ACHIEVEMENTS,
  CATEGORY_META,
  TOTAL_LEAVES,
  TOTAL_TIERS,
  tierKey,
  type AchievementCategory,
  type AchievementDef,
} from '../../lib/achievements'
import { useAchievements, liveMetric } from '../../store/achievements'
import { usePomodoro } from '../../store/pomodoro'
import { useMagnet } from '../../store/magnet'
import { useFriends } from '../../store/friends'
import { useSocial } from '../../store/social'
import { useProfile } from '../../store/profile'
import { Icon2d } from './Icon2d'
import { LeafBurst } from './LeafBurst'
import { GREEN_LEAF_ICON } from '../../lib/leafIcons'
import './AchievementsPanel.css'

interface AchievementsPanelProps {
  isOwn: boolean
  /** claimed tierKey map for public profiles (parsed from the remote blob) */
  earned?: Record<string, string>
}

const ALL_CATEGORIES: (AchievementCategory | 'all')[] = ['all', 'library', 'login', 'activity', 'friends', 'followers', 'host', 'rank', 'realm']

export function AchievementsPanel({ isOwn, earned }: AchievementsPanelProps) {
  const [filter, setFilter] = useState<'all' | AchievementCategory>('all')
  const [justClaimed, setJustClaimed] = useState<string | null>(null)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [burst, setBurst] = useState<null | { id: number; from: { x: number; y: number }; to: { x: number; y: number } }>(null)
  const leavesRef = useRef<HTMLSpanElement | null>(null)
  const burstDone = useCallback(() => setBurst(null), [])

  const claimedMap = useAchievements((s) => s.claimed)
  const ready = useAchievements((s) => s.ready)

  // Subscribe to the live stores so progress re-renders as things change.
  usePomodoro((s) => s.totalFocusMin)
  usePomodoro((s) => s.completed)
  useMagnet((s) => s.data)
  useFriends((s) => s.friendIds)
  useFriends((s) => s.outgoing)
  useSocial((s) => s.myCounts)
  useProfile((s) => s.rankXp)

  const earnedKeys = useMemo(
    () => (isOwn ? claimedMap : (earned ?? {})),
    [isOwn, claimedMap, earned],
  )

  const visible = useMemo(
    () => ACHIEVEMENTS.filter((a) => !a.comingSoon && (filter === 'all' || a.category === filter)),
    [filter],
  )
  const comingSoon = useMemo(
    () => ACHIEVEMENTS.filter((a) => a.comingSoon && (filter === 'all' || a.category === filter)),
    [filter],
  )

  const totalEarned = Object.keys(earnedKeys).length
  const leavesEarned = useMemo(() => {
    let n = 0
    for (const key of Object.keys(earnedKeys)) {
      const idx = Number(key.slice(key.lastIndexOf(':') + 1)) || 0
      const ach = ACHIEVEMENTS.find((a) => key.startsWith(`${a.id}:`))
      if (ach && ach.tiers[idx]) n += ach.tiers[idx].leaves
    }
    return n
  }, [earnedKeys])

  async function onClaim(
    def: AchievementDef,
    idx: number,
    e?: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (!isOwn || claiming) return
    const key = tierKey(def.id, idx)
    setClaiming(key)
    const ok = await useAchievements.getState().claim(def, idx)
    setClaiming(null)
    if (ok) {
      setJustClaimed(key)
      window.setTimeout(() => setJustClaimed((cur) => (cur === key ? null : cur)), 1800)

      // Leaves fly from the claim button up to the header leaves counter.
      const fromEl = e?.currentTarget as HTMLElement | undefined
      const toEl = leavesRef.current
      if (fromEl && toEl) {
        const fb = fromEl.getBoundingClientRect()
        const tb = toEl.getBoundingClientRect()
        setBurst({
          id: Date.now(),
          from: { x: fb.left + fb.width / 2, y: fb.top + fb.height / 2 },
          to: { x: tb.left + tb.width / 2, y: tb.top + tb.height * 0.45 },
        })
      }
    }
  }

  return (
    <div className="ach-panel">
      <div className="ach-header">
        <div className="ach-title-row">
          <span className="ach-title">Achievements</span>
          {isOwn && (
            <span className="ach-leaves" ref={leavesRef}>
              <img className="ach-leaf-icon" src={GREEN_LEAF_ICON} alt="" draggable={false} />
              {leavesEarned.toLocaleString()}
              <span className="ach-leaves-total"> / {TOTAL_LEAVES.toLocaleString()} leaves</span>
            </span>
          )}
        </div>
        <div className="ach-count-line">
          {totalEarned} / {TOTAL_TIERS} claimed
        </div>
        <div className="ach-overall-track">
          <div
            className="ach-overall-fill"
            style={{ width: `${TOTAL_TIERS > 0 ? (totalEarned / TOTAL_TIERS) * 100 : 0}%` }}
          />
        </div>
      </div>

      {isOwn && (
        <div className="ach-filters">
          {ALL_CATEGORIES.map((c) => (
            <button
              key={c}
              className={`ach-filter-chip ${filter === c ? 'active' : ''}`}
              onClick={() => setFilter(c)}
            >
              {c !== 'all' && (
                <span className="ach-chip-icon">
                  <Icon2d name={CATEGORY_META[c].icon} size={13} />
                </span>
              )}
              {c === 'all' ? 'All' : CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      )}

      <div className="ach-list">
        {visible.map((ach) => (
          <AchievementRow
            key={ach.id}
            def={ach}
            isOwn={isOwn}
            earnedKeys={earnedKeys}
            justClaimed={justClaimed}
            claiming={claiming}
            onClaim={onClaim}
          />
        ))}
      </div>

      {isOwn && comingSoon.length > 0 && (
        <div className="ach-coming-section">
          <div className="ach-coming-title">Coming Soon</div>
          <div className="ach-list">
            {comingSoon.map((ach) => (
              <ComingSoonRow key={ach.id} def={ach} />
            ))}
          </div>
        </div>
      )}

      {!ready && isOwn && <div className="ach-loading">Syncing achievements…</div>}

      {burst && (
        <LeafBurst
          key={burst.id}
          from={burst.from}
          to={burst.to}
          onDone={burstDone}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- row */

function AchievementRow({
  def,
  isOwn,
  earnedKeys,
  justClaimed,
  claiming,
  onClaim,
}: {
  def: AchievementDef
  isOwn: boolean
  earnedKeys: Record<string, string>
  justClaimed: string | null
  claiming: string | null
  onClaim: (def: AchievementDef, idx: number, e?: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const current = liveMetric(def.metric)
  const anyClaimed = def.tiers.some((t) => earnedKeys[t.key])

  if (!isOwn && !anyClaimed) return null

  const nextIdx = def.tiers.findIndex((t) => !earnedKeys[t.key])
  const allClaimed = nextIdx < 0
  const nextTier = nextIdx >= 0 ? def.tiers[nextIdx] : null
  const pct = nextTier ? Math.min(100, Math.round((current / nextTier.threshold) * 100)) : 100

  return (
    <div
      className={`ach-row ${anyClaimed ? 'has-earned' : ''} ${allClaimed ? 'complete' : ''}`}
      title={def.detail}
    >
      <div className="ach-row-icon">
        <Icon2d name={def.icon} size={17} />
      </div>

      <div className="ach-row-main">
        <span className="ach-row-title">{def.title}</span>

        {isOwn ? (
          <>
            <div className="ach-row-bar-wrap">
              <div className="ach-row-bar">
                <div className="ach-row-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {nextTier ? (
              <span className="ach-row-count">
                {current.toLocaleString()}/{nextTier.threshold.toLocaleString()}
              </span>
            ) : (
              <span className="ach-row-complete">✓</span>
            )}
          </>
        ) : (
          <span className="ach-public-earned">
            {def.tiers.filter((t) => earnedKeys[t.key]).length}/{def.tiers.length}
          </span>
        )}
      </div>

      {isOwn && (
        <div className="ach-row-side">
          {nextTier ? (
            <>
              <span className="ach-row-reward">
                <img className="ach-leaf-icon" src={GREEN_LEAF_ICON} alt="" draggable={false} />
                +{nextTier.leaves}
              </span>
              <button
                className={`ach-claim-btn ${current >= nextTier.threshold ? 'ready' : ''}`}
                disabled={current < nextTier.threshold || claiming === nextTier.key}
                onClick={(e) => onClaim(def, nextIdx, e)}
              >
                {justClaimed === nextTier.key
                  ? '✓'
                  : claiming === nextTier.key
                    ? 'Claiming…'
                    : 'Claim'}
              </button>
            </>
          ) : (
            <span className="ach-row-done">✓</span>
          )}
        </div>
      )}

      <span className="ach-pips">
        {def.tiers.map((t, i) => {
          const claimed = !!earnedKeys[t.key]
          const reached = isOwn && current >= t.threshold
          const isNext = i === nextIdx
          return (
            <span
              key={t.key}
              className={`ach-pip ${claimed ? 'claimed' : reached ? 'claimable' : ''} ${isNext ? 'next' : ''}`}
              title={t.name}
            >
              {claimed ? '◆' : '◇'}
            </span>
          )
        })}
      </span>
    </div>
  )
}

/* ---------------------------------------------------------- coming soon row */

function ComingSoonRow({ def }: { def: AchievementDef }) {
  return (
    <div className="ach-row coming-soon">
      <div className="ach-row-icon">
        <Icon2d name={def.icon} size={17} />
      </div>
      <span className="ach-row-title">{def.title}</span>
      <span className="ach-row-locked">
        <Icon2d name="lock" size={13} /> Coming soon
      </span>
    </div>
  )
}
