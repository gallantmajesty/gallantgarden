import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useSocial } from '../store/social'
import { usePomodoro } from '../store/pomodoro'
import { useMagnet } from '../store/magnet'
import { insforge } from '../lib/insforge'
import {
  getProfilesByIds,
  getFollowerIds,
  getFollowingIds,
  getMutualIds,
  getPublicProfileByUsername,
} from '../lib/social'
import { buildProfileStats, loadStudyCounts, type StudyCounts } from '../lib/stats'
import { BANNERS, getBanner } from '../lib/banners'
import { checkUsername } from '../lib/usernames'
import type { ProfilePublic, PublicProfile } from '../lib/types'
import {
  loadLayout,
  saveLayout,
  type ProfileLayout,
  type ProfileWidgetId,
} from '../lib/profileLayout'
import { Flag } from '../components/Flag'
import { Icon } from '../components/magnet/Icon'
import { RankBadge } from '../components/RankBadge'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { FollowButton } from '../components/FollowButton'
import { StatCard } from '../components/StatCard'
import { UserListModal } from '../components/UserListModal'
import './Profile.css'

// The customizable "study base" profile. One component serves both the editable
// own profile (/profile) and read-only public profiles (/u/:username).

interface ProfileView {
  id: string
  username: string | null
  displayName: string
  avatarUrl: string | null
  country: string | null
  rankId: string | null
  pub: ProfilePublic
}

export function Profile() {
  const { username: routeUsername } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // own-profile store slices
  const ownUsername = useProfile((s) => s.username)
  const ownDisplayName = useProfile((s) => s.displayName)
  const ownAvatarUrl = useProfile((s) => s.avatarUrl)
  const ownPub = useProfile((s) => s.pub)
  const ownCountry = useProfile((s) => s.data.country)
  const ownRank = useProfile((s) => s.data.rank)

  const isOwnRoute = !routeUsername || routeUsername.toLowerCase() === (ownUsername ?? '').toLowerCase()

  const [remote, setRemote] = useState<PublicProfile | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Load a remote profile when viewing someone else's /u/:username. State is
  // only set inside the async callback (no synchronous setState in the effect).
  useEffect(() => {
    if (isOwnRoute || !routeUsername) return
    let cancelled = false
    void getPublicProfileByUsername(routeUsername).then((p) => {
      if (cancelled) return
      setRemote(p)
      setNotFound(!p)
    })
    return () => {
      cancelled = true
    }
  }, [isOwnRoute, routeUsername])

  const isOwn = isOwnRoute
  const view: ProfileView | null = useMemo(() => {
    if (isOwn) {
      if (!user) return null
      return {
        id: user.id,
        username: ownUsername,
        displayName: ownDisplayName,
        avatarUrl: ownAvatarUrl,
        country: ownCountry,
        rankId: ownRank,
        pub: ownPub,
      }
    }
    // only trust `remote` once it matches the username in the URL (avoids a
    // flash of the previous profile while navigating between public pages)
    if (remote && remote.username?.toLowerCase() === routeUsername?.toLowerCase()) {
      return {
        id: remote.id,
        username: remote.username,
        displayName: remote.display_name,
        avatarUrl: remote.avatar_url,
        country: remote.country,
        rankId: remote.rank,
        pub: remote.public_profile,
      }
    }
    return null
  }, [isOwn, user, ownUsername, ownDisplayName, ownAvatarUrl, ownCountry, ownRank, ownPub, remote, routeUsername])

  if (notFound) {
    return (
      <div className="pf-root">
        <TopBar onBack={() => navigate('/')} />
        <div className="pf-notfound sf-panel">
          <h2>Explorer not found</h2>
          <p>There's no profile with that username yet.</p>
          <button className="sf-btn" onClick={() => navigate('/')}>
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="pf-root">
        <TopBar onBack={() => navigate('/')} />
        <div className="pf-loading">Loading profile…</div>
      </div>
    )
  }

  return <ProfileBody view={view} isOwn={isOwn} onBack={() => navigate('/')} />
}

function TopBar({ onBack, right }: { onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="pf-topbar">
      <button className="sf-btn ghost pf-back" onClick={onBack}>
        <Icon name="back" size={18} /> Lobby
      </button>
      {right && <div className="pf-topbar-right">{right}</div>}
    </div>
  )
}

/* ----------------------------------------------------------------- main body */

function ProfileBody({
  view,
  isOwn,
  onBack,
}: {
  view: ProfileView
  isOwn: boolean
  onBack: () => void
}) {
  const myCounts = useSocial((s) => s.myCounts)
  const { signOut } = useAuth()

  const [editing, setEditing] = useState(false)
  const [remoteCounts, setRemoteCounts] = useState<{ followers: number; following: number }>({
    followers: 0,
    following: 0,
  })
  const [studyCounts, setStudyCounts] = useState<StudyCounts>({ trees: 0, notes: 0 })
  const [listModal, setListModal] = useState<null | 'followers' | 'following' | 'mutual'>(null)

  // Own counts come live from the social store (optimistic follows); a public
  // profile's counts are fetched once.
  const counts = isOwn ? myCounts : remoteCounts

  useEffect(() => {
    let cancelled = false
    if (!isOwn) {
      void Promise.all([getFollowerIds(view.id), getFollowingIds(view.id)]).then(([fr, fg]) => {
        if (!cancelled) setRemoteCounts({ followers: fr.length, following: fg.length })
      })
    } else {
      void loadStudyCounts(view.id).then((c) => {
        if (!cancelled) setStudyCounts(c)
      })
    }
    return () => {
      cancelled = true
    }
  }, [view.id, isOwn])

  const banner = getBanner(view.pub.banner)

  // widget layout (own profile can reorder/hide; public renders the default
  // order with nothing hidden)
  const [layout, setLayout] = useState<ProfileLayout>(() =>
    isOwn ? loadLayout(view.id) : { order: loadLayout().order, hidden: [] },
  )
  const updateLayout = useCallback(
    (next: ProfileLayout) => {
      setLayout(next)
      if (isOwn) saveLayout(next, view.id)
    },
    [isOwn, view.id],
  )

  const visibleWidgets = layout.order.filter((id) => isOwn || !layout.hidden.includes(id))

  return (
    <div className="pf-root">
      <TopBar
        onBack={onBack}
        right={
          isOwn ? (
            <button className="sf-btn ghost pf-signout" onClick={signOut}>
              <Icon name="back" size={16} /> Sign Out
            </button>
          ) : undefined
        }
      />

      <div className="pf-sheet">
        {/* ---------------- identity header ---------------- */}
        <header className="pf-header sf-panel">
          <div
            className="pf-banner"
            style={{ background: banner.css, ['--banner-glow' as string]: banner.glow }}
          >
            {isOwn && editing && <BannerPicker view={view} />}
          </div>

          <div className="pf-identity">
            <div className="pf-avatar-wrap">
              <ProfileAvatar
                name={view.displayName}
                avatarUrl={view.avatarUrl}
                rankId={view.rankId}
                size={104}
                className="pf-avatar"
              />
              {isOwn && editing && <AvatarUpload />}
            </div>

            <div className="pf-id-main">
              {isOwn && editing ? (
                <IdentityEditor view={view} />
              ) : (
                <>
                  <h1 className="pf-name">
                    {view.displayName}
                    {view.country && <Flag code={view.country} className="pf-flag" />}
                  </h1>
                  <div className="pf-handle">{view.username ? `@${view.username}` : 'no username yet'}</div>
                </>
              )}

              <div className="pf-rankrow">
                <RankBadge rankId={view.rankId} size={26} showName className="pf-rankbadge" />
              </div>

              <div className="pf-counts">
                <button className="pf-count" onClick={() => setListModal('followers')}>
                  <strong>{counts.followers}</strong> Followers
                </button>
                <button className="pf-count" onClick={() => setListModal('following')}>
                  <strong>{counts.following}</strong> Following
                </button>
                {!isOwn && (
                  <button className="pf-count" onClick={() => setListModal('mutual')}>
                    Mutual
                  </button>
                )}
              </div>
            </div>

            <div className="pf-actions">
              {isOwn ? (
                <button
                  className={`sf-btn ${editing ? '' : 'secondary'} pf-customize`}
                  onClick={() => setEditing((v) => !v)}
                >
                  <Icon name={editing ? 'check' : 'edit'} size={16} />
                  {editing ? 'Done' : 'Customize'}
                </button>
              ) : (
                <FollowButton targetId={view.id} />
              )}
              <ShareButton username={view.username} />
            </div>
          </div>
        </header>

        {/* ---------------- widgets ---------------- */}
        <div className="pf-widgets">
          {visibleWidgets.map((id, index) => (
            <WidgetShell
              key={id}
              id={id as ProfileWidgetId}
              index={index}
              editing={isOwn && editing}
              hidden={layout.hidden.includes(id)}
              onReorder={(from, to) => {
                // map visible indices back to positions in the full order so
                // hidden widgets keep their place
                const full = [...layout.order]
                const fi = full.indexOf(visibleWidgets[from])
                const ti = full.indexOf(visibleWidgets[to])
                if (fi < 0 || ti < 0) return
                full.splice(ti, 0, full.splice(fi, 1)[0])
                updateLayout({ ...layout, order: full })
              }}
              onToggleHidden={() =>
                updateLayout({
                  ...layout,
                  hidden: layout.hidden.includes(id)
                    ? layout.hidden.filter((w) => w !== id)
                    : [...layout.hidden, id],
                })
              }
            >
              <Widget
                id={id as ProfileWidgetId}
                view={view}
                isOwn={isOwn}
                editing={isOwn && editing}
                studyCounts={studyCounts}
              />
            </WidgetShell>
          ))}
        </div>
      </div>

      {/* ---------------- follower/following/mutual lists ---------------- */}
      <UserListModal
        open={listModal === 'followers'}
        title="Followers"
        onClose={() => setListModal(null)}
        load={async () => getProfilesByIds(await getFollowerIds(view.id))}
      />
      <UserListModal
        open={listModal === 'following'}
        title="Following"
        onClose={() => setListModal(null)}
        load={async () => getProfilesByIds(await getFollowingIds(view.id))}
      />
      <UserListModal
        open={listModal === 'mutual'}
        title="Mutual Followers"
        onClose={() => setListModal(null)}
        load={async () => {
          const me = useSocial.getState().meId
          if (!me) return []
          return getProfilesByIds(await getMutualIds(me, view.id))
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------- share button */

function ShareButton({ username }: { username: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!username) return null
  async function copy() {
    const url = `${window.location.origin}/u/${username}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <button className="sf-btn ghost pf-share" onClick={copy} title="Copy profile link">
      <Icon name="people" size={16} /> {copied ? 'Copied!' : 'Share'}
    </button>
  )
}

/* ----------------------------------------------------------- identity editor */

function IdentityEditor({ view }: { view: ProfileView }) {
  const setDisplayName = useProfile((s) => s.setDisplayName)
  const setUsername = useProfile((s) => s.setUsername)
  const [name, setName] = useState(view.displayName)
  const [handle, setHandle] = useState(view.username ?? '')
  const [check, setCheck] = useState<{ ok: boolean; error?: string; checking?: boolean }>({ ok: true })
  const debounce = useRef<number | null>(null)

  function onHandle(v: string) {
    const next = v.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setHandle(next)
    if (debounce.current) window.clearTimeout(debounce.current)
    if (next === (view.username ?? '')) {
      setCheck({ ok: true })
      return
    }
    setCheck({ ok: false, checking: true })
    debounce.current = window.setTimeout(async () => {
      const res = await checkUsername(next, view.id)
      setCheck({ ok: res.ok, error: res.error })
    }, 400)
  }

  async function saveName() {
    if (name.trim() && name.trim() !== view.displayName) await setDisplayName(name)
  }
  async function saveHandle() {
    if (check.ok && handle && handle !== view.username) {
      const ok = await setUsername(handle)
      if (!ok) setCheck({ ok: false, error: 'That username is taken' })
    }
  }

  return (
    <div className="pf-id-edit">
      <input
        className="sf-input pf-name-input"
        value={name}
        maxLength={40}
        placeholder="Display name"
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
      />
      <div className="pf-handle-edit">
        <span className="pf-at">@</span>
        <input
          className="sf-input pf-handle-input"
          value={handle}
          maxLength={20}
          placeholder="username"
          onChange={(e) => onHandle(e.target.value)}
          onBlur={saveHandle}
        />
        <span className={`pf-handle-status ${check.ok ? 'ok' : 'bad'}`}>
          {check.checking ? '…' : check.ok ? '✓' : check.error}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ avatar upload */

function AvatarUpload() {
  const setAvatarUrl = useProfile((s) => s.setAvatarUrl)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const { data, error } = await insforge.storage.from('avatars').uploadAuto(file)
      if (!error && data?.url) await setAvatarUrl(data.url)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <button
        className="pf-avatar-upload"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Change picture"
      >
        <Icon name="edit" size={16} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />
    </>
  )
}

/* ------------------------------------------------------------ banner picker */

function BannerPicker({ view }: { view: ProfileView }) {
  const savePublic = useProfile((s) => s.savePublic)
  return (
    <div className="pf-banner-picker" onClick={(e) => e.stopPropagation()}>
      {BANNERS.map((b) => (
        <button
          key={b.id}
          className={`pf-banner-swatch ${view.pub.banner === b.id ? 'on' : ''}`}
          style={{ background: b.css }}
          title={b.name}
          onClick={() => savePublic({ banner: b.id })}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------- widget shell */

function WidgetShell({
  id,
  index,
  editing,
  hidden,
  children,
  onReorder,
  onToggleHidden,
}: {
  id: ProfileWidgetId
  index: number
  editing: boolean
  hidden: boolean
  children: React.ReactNode
  onReorder: (from: number, to: number) => void
  onToggleHidden: () => void
}) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <section
      className={`pf-widget sf-panel ${editing ? 'editing' : ''} ${hidden ? 'is-hidden' : ''} ${dragOver ? 'dragover' : ''}`}
      draggable={editing}
      onDragStart={(e) => editing && e.dataTransfer.setData('text/plain', String(index))}
      onDragOver={(e) => {
        if (!editing) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!editing) return
        e.preventDefault()
        setDragOver(false)
        const from = Number(e.dataTransfer.getData('text/plain'))
        if (Number.isFinite(from) && from !== index) onReorder(from, index)
      }}
    >
      {editing && (
        <div className="pf-widget-bar">
          <span className="pf-drag" title="Drag to reorder">
            <Icon name="target" size={14} /> {id.replace(/-/g, ' ')}
          </span>
          <button className="pf-widget-hide" onClick={onToggleHidden}>
            {hidden ? 'Show' : 'Hide'}
          </button>
        </div>
      )}
      {!hidden || editing ? children : null}
    </section>
  )
}

/* ------------------------------------------------------------------ widgets */

function Widget({
  id,
  view,
  isOwn,
  editing,
  studyCounts,
}: {
  id: ProfileWidgetId
  view: ProfileView
  isOwn: boolean
  editing: boolean
  studyCounts: StudyCounts
}) {
  switch (id) {
    case 'about':
      return <AboutWidget view={view} editing={editing} />
    case 'favorite-subject':
      return <SubjectWidget view={view} editing={editing} />
    case 'interests':
      return <InterestsWidget view={view} editing={editing} />
    case 'schedule':
      return <ScheduleWidget view={view} editing={editing} />
    case 'stats':
      return <StatsWidget view={view} isOwn={isOwn} studyCounts={studyCounts} />
    case 'achievements':
      return <AchievementsWidget isOwn={isOwn} />
    case 'social-links':
      return <SocialLinksWidget view={view} editing={editing} />
    default:
      return null
  }
}

function WidgetTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h2 className="pf-widget-title">
      <Icon name={icon} size={18} />
      {children}
    </h2>
  )
}

function AboutWidget({ view, editing }: { view: ProfileView; editing: boolean }) {
  const savePublic = useProfile((s) => s.savePublic)
  const [bio, setBio] = useState(view.pub.bio)
  if (editing) {
    return (
      <>
        <WidgetTitle icon="journal">About</WidgetTitle>
        <textarea
          className="sf-input pf-textarea"
          value={bio}
          maxLength={280}
          placeholder="Tell other explorers about your study journey…"
          onChange={(e) => setBio(e.target.value)}
          onBlur={() => bio !== view.pub.bio && savePublic({ bio })}
        />
      </>
    )
  }
  return (
    <>
      <WidgetTitle icon="journal">About</WidgetTitle>
      {view.pub.bio ? <p className="pf-bio">{view.pub.bio}</p> : <p className="pf-muted">No bio yet.</p>}
    </>
  )
}

function SubjectWidget({ view, editing }: { view: ProfileView; editing: boolean }) {
  const savePublic = useProfile((s) => s.savePublic)
  const [v, setV] = useState(view.pub.favoriteSubject)
  return (
    <>
      <WidgetTitle icon="book">Favorite Subject</WidgetTitle>
      {editing ? (
        <input
          className="sf-input"
          value={v}
          maxLength={48}
          placeholder="e.g. Organic Chemistry"
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== view.pub.favoriteSubject && savePublic({ favoriteSubject: v })}
        />
      ) : view.pub.favoriteSubject ? (
        <div className="pf-subject">{view.pub.favoriteSubject}</div>
      ) : (
        <p className="pf-muted">Not set.</p>
      )}
    </>
  )
}

function ScheduleWidget({ view, editing }: { view: ProfileView; editing: boolean }) {
  const savePublic = useProfile((s) => s.savePublic)
  const [v, setV] = useState(view.pub.studySchedule)
  return (
    <>
      <WidgetTitle icon="calendar">Study Schedule</WidgetTitle>
      {editing ? (
        <input
          className="sf-input"
          value={v}
          maxLength={80}
          placeholder="e.g. Early mornings + late nights"
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== view.pub.studySchedule && savePublic({ studySchedule: v })}
        />
      ) : view.pub.studySchedule ? (
        <div className="pf-subject">{view.pub.studySchedule}</div>
      ) : (
        <p className="pf-muted">Not set.</p>
      )}
    </>
  )
}

function InterestsWidget({ view, editing }: { view: ProfileView; editing: boolean }) {
  const savePublic = useProfile((s) => s.savePublic)
  const [draft, setDraft] = useState('')
  const interests = view.pub.studyInterests

  function add() {
    const t = draft.trim()
    if (!t || interests.includes(t) || interests.length >= 12) return
    savePublic({ studyInterests: [...interests, t] })
    setDraft('')
  }
  function remove(tag: string) {
    savePublic({ studyInterests: interests.filter((x) => x !== tag) })
  }

  return (
    <>
      <WidgetTitle icon="brain">Study Interests</WidgetTitle>
      <div className="pf-chips">
        {interests.map((tag) => (
          <span key={tag} className="pf-chip">
            {tag}
            {editing && (
              <button className="pf-chip-x" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>
                ×
              </button>
            )}
          </span>
        ))}
        {interests.length === 0 && !editing && <p className="pf-muted">No interests added.</p>}
      </div>
      {editing && (
        <div className="pf-chip-add">
          <input
            className="sf-input"
            value={draft}
            maxLength={24}
            placeholder="Add an interest…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="sf-btn secondary" onClick={add}>
            Add
          </button>
        </div>
      )}
    </>
  )
}

function StatsWidget({
  view,
  isOwn,
  studyCounts,
}: {
  view: ProfileView
  isOwn: boolean
  studyCounts: StudyCounts
}) {
  const focusSessions = usePomodoro((s) => s.completed)
  const totalFocusMin = usePomodoro((s) => s.totalFocusMin)
  const xp = useMagnet((s) => s.data.xp)
  const achievements = useMagnet((s) => s.data.achievements.length)

  const stats = useMemo(() => {
    const all = buildProfileStats({
      focusSessions,
      totalFocusMin,
      counts: studyCounts,
      rankId: view.rankId,
      xp,
      achievementsUnlocked: achievements,
      interestCount: view.pub.studyInterests.length,
    })
    // On someone else's profile, personal study data (device-local + owner-only
    // RLS) isn't readable, so only the public rank card is shown.
    return isOwn ? all : all.filter((s) => s.id === 'rank')
  }, [focusSessions, totalFocusMin, studyCounts, view.rankId, xp, achievements, view.pub.studyInterests.length, isOwn])

  return (
    <>
      <WidgetTitle icon="chart">Performance</WidgetTitle>
      <div className="pf-stats-grid">
        {stats.map((s) => (
          <StatCard key={s.id} stat={s} />
        ))}
      </div>
      {!isOwn && <p className="pf-muted pf-stats-note">Detailed study stats are private to each explorer.</p>}
    </>
  )
}

function AchievementsWidget({ isOwn }: { isOwn: boolean }) {
  const achievements = useMagnet((s) => s.data.achievements)
  if (!isOwn) {
    return (
      <>
        <WidgetTitle icon="trophy">Achievements</WidgetTitle>
        <p className="pf-muted">Achievements are private for now.</p>
      </>
    )
  }
  return (
    <>
      <WidgetTitle icon="trophy">Achievements</WidgetTitle>
      {achievements.length === 0 ? (
        <p className="pf-muted">No achievements yet — keep studying to earn them.</p>
      ) : (
        <div className="pf-achievements">
          {achievements.slice(0, 8).map((a) => (
            <div key={a.id} className="pf-achievement" title={a.detail}>
              <Icon name="sparkle" size={16} />
              <span>{a.title}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function SocialLinksWidget({ view, editing }: { view: ProfileView; editing: boolean }) {
  const savePublic = useProfile((s) => s.savePublic)
  const links = view.pub.socialLinks
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  function add() {
    const u = url.trim()
    if (!u || links.length >= 6) return
    const href = /^https?:\/\//.test(u) ? u : `https://${u}`
    savePublic({ socialLinks: [...links, { label: label.trim() || href.replace(/^https?:\/\//, ''), url: href }] })
    setLabel('')
    setUrl('')
  }
  function remove(i: number) {
    savePublic({ socialLinks: links.filter((_, idx) => idx !== i) })
  }

  return (
    <>
      <WidgetTitle icon="globe">Social Links</WidgetTitle>
      <div className="pf-links">
        {links.map((l, i) => (
          <span key={`${l.url}-${i}`} className="pf-link">
            {editing ? (
              <span className="pf-link-label">{l.label}</span>
            ) : (
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            )}
            {editing && (
              <button className="pf-chip-x" onClick={() => remove(i)} aria-label="Remove link">
                ×
              </button>
            )}
          </span>
        ))}
        {links.length === 0 && !editing && <p className="pf-muted">No links added.</p>}
      </div>
      {editing && (
        <div className="pf-link-add">
          <input className="sf-input" value={label} maxLength={24} placeholder="Label" onChange={(e) => setLabel(e.target.value)} />
          <input className="sf-input" value={url} maxLength={120} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
          <button className="sf-btn secondary" onClick={add}>
            Add
          </button>
        </div>
      )}
    </>
  )
}
