import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { RankBadge } from '../components/RankBadge'
import { getRank, rankForTotalXp } from '../lib/ranks'
import { useMagnet } from '../store/magnet'
import { levelProgress } from '../lib/magnet/types'
import { Icon } from '../components/magnet/Icon'
import { PngIcon, type PngIconName } from '../components/PngIcon'
import { Dashboard } from '../components/magnet/views/Dashboard'
import { TasksView } from '../components/magnet/views/TasksView'
import { AnalyticsView } from '../components/magnet/views/AnalyticsView'
import { GoalsView } from '../components/magnet/views/GoalsView'
import { HabitsView } from '../components/magnet/views/HabitsView'
import { SanctuaryView } from '../components/magnet/views/SanctuaryView'
import { SheetView } from '../components/magnet/views/SheetView'
import { CalendarView } from '../components/magnet/views/CalendarView'

import './TaskMagnet.css'

// Single, fixed professional palette: coffee brown surfaces, yellow primary
// accent and purple secondary accent. No per-user theming.
const MG_PALETTE = {
  bg: '#1c1611',
  panel: '#271f17',
  panelSoft: '#322619',
  border: 'rgba(255, 240, 220, 0.10)',
  text: '#f4ece1',
  textSoft: '#b6a48d',
  accent: '#d8a657',
  accent2: '#9b6dff',
  shadow: 'rgba(0, 0, 0, 0.35)',
}

export type MagnetView =
  | 'dashboard'
  | 'tasks'
  | 'sheet'
  | 'analytics'
  | 'goals'
  | 'habits'
  | 'sanctuary'
  | 'calendar'

export function TaskMagnet() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const hydrate = useMagnet((s) => s.hydrate)
  const ready = useMagnet((s) => s.ready)
  const data = useMagnet((s) => s.data)
  const toast = useMagnet((s) => s.toast)
  const clearToast = useMagnet((s) => s.clearToast)

  const [view, setView] = useState<MagnetView>('dashboard')
  const [navOpen, setNavOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [prefillDue, setPrefillDue] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) hydrate(user.id)
  }, [user?.id, hydrate])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(clearToast, 4200)
    return () => clearTimeout(timer)
  }, [toast, clearToast])

  // Keyboard shortcuts: 1-8 switch views, Esc closes overlays, ? shows help.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)
      if (e.key === 'Escape') {
        setNavOpen(false)
        setHelpOpen(false)
        return
      }
      if (typing) return
      if (e.key === '?') {
        setHelpOpen((h) => !h)
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= NAV.length) {
        setView(NAV[n - 1].key)
        setNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Fixed professional palette — no per-user theming.
  const rootStyle = useMemo(() => {
    const v = MG_PALETTE
    return {
      ['--mg-bg' as string]: v.bg,
      ['--mg-panel']: v.panel,
      ['--mg-panel-soft']: v.panelSoft,
      ['--mg-border']: v.border,
      ['--mg-text']: v.text,
      ['--mg-text-soft']: v.textSoft,
      ['--mg-accent']: v.accent,
      ['--mg-accent2']: v.accent2,
      ['--mg-shadow']: v.shadow,
      ['--accent' as string]: v.accent,
      ['--accent2' as string]: v.accent2,
      fontFamily: data.font === 'Inter' ? 'var(--sans)' : `${data.font}, var(--sans)`,
    } as React.CSSProperties
  }, [data.font])

  const NAV: { key: MagnetView; label: string; icon: string; png?: PngIconName }[] = [
    { key: 'dashboard', label: t('taskMagnet.navDashboard'), icon: 'home' },
    { key: 'tasks', label: t('taskMagnet.navTasks'), icon: 'check', png: 'tasks' },
    { key: 'analytics', label: t('taskMagnet.navAnalytics'), icon: 'chart', png: 'analytics' },
    { key: 'goals', label: t('taskMagnet.navGoals'), icon: 'target', png: 'goals' },
    { key: 'habits', label: t('taskMagnet.navHabits'), icon: 'fire', png: 'habits' },
    { key: 'sanctuary', label: t('taskMagnet.navSanctuary'), icon: 'vault', png: 'achievements' },
    { key: 'calendar', label: t('taskMagnet.navCalendar'), icon: 'calendar' },
    { key: 'sheet', label: t('taskMagnet.navSheet'), icon: 'grid' },
  ]

  const profileName = useProfile((s) => s.displayName)
  const displayName =
    (profileName && profileName !== 'Explorer' ? profileName : null) ||
    user?.profile?.name ||
    user?.email?.split('@')[0] ||
    t('auth.defaultName')
  const lp = levelProgress(data.xp)
  // Rank is driven by lifetime rankXp (monotonic) — the rail chip shows the
  // live rank so the magnet's streak/daily awards visibly feed it.
  const rankId = rankForTotalXp(data.rankXp || data.xp).id

  if (!ready) {
    return (
      <div className="mg-root mg-loading dark" style={rootStyle}>
        <div className="mg-loading-card">{t('taskMagnet.openingWorld')}</div>
      </div>
    )
  }

  return (
    <div className="mg-root dark" style={rootStyle}>

      <aside className={`mg-sidebar ${navOpen ? 'open' : ''}`}>
        <button className="mg-back" onClick={() => navigate(-1)}>
          <Icon name="back" size={18} /> {t('common.lobby')}
        </button>

        <div className="mg-brand">
          <span className="mg-brand-orb">
            <img className="mg-brand-logo-img" src="/task-mgmt-logo.png" alt="Task Magnet" />
          </span>
          <div>
            <strong>{t('taskMagnet.brand')}</strong>
            <small>Task Magnet</small>
          </div>
        </div>

        <nav className="mg-nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`mg-navitem ${view === n.key ? 'active' : ''}`}
              onClick={() => {
                setView(n.key)
                setNavOpen(false)
              }}
            >
              {n.png ? (
                <PngIcon name={n.png} size={24} className="mg-navpng" />
              ) : (
                <span className="mg-navtile">
                  <Icon name={n.icon} size={18} />
                </span>
              )}
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="mg-levelcard">
          <div className="mg-levelcard-top">
            <span className="mg-rankchip" style={{ ['--rank' as string]: getRank(rankId).accent }}>
              <RankBadge rankId={rankId} size={22} />
              <span>{getRank(rankId).name}</span>
            </span>
            <span className="mg-levelxp">
              <Icon name="leaf" size={13} />
              {t('taskMagnet.xpValue', { xp: data.xp })}
            </span>
          </div>
          <div className="mg-levelbar">
            <div className="mg-levelbar-fill" style={{ width: `${lp.pct * 100}%` }} />
          </div>
          <small>{t('taskMagnet.xpToLevel', { xp: lp.span - lp.into, nextLevel: lp.level + 1 })}</small>
        </div>
      </aside>

      <main className="mg-main">
        <header className="mg-topbar">
          <button className="mg-burger" onClick={() => setNavOpen((o) => !o)} aria-label={t('taskMagnet.menu')}>
            <Icon name={navOpen ? 'close' : 'chevron'} size={20} />
          </button>
          <div className="mg-topbar-title">
            {NAV.find((n) => n.key === view)?.label}
          </div>
          <div className="mg-topbar-user">
            <span className="mg-topbar-name">{displayName}</span>
            <span className="mg-topbar-dot" />
          </div>
        </header>

        <div className="mg-content">
          {view === 'dashboard' && <Dashboard name={displayName} onNavigate={setView} />}
          {view === 'tasks' && (
            <TasksView prefillDue={prefillDue} onPrefillDue={() => setPrefillDue(null)} />
          )}
          {view === 'sheet' && <SheetView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'goals' && <GoalsView />}
          {view === 'habits' && <HabitsView />}
          {view === 'sanctuary' && <SanctuaryView />}
          {view === 'calendar' && <CalendarView />}
        </div>
      </main>

      {toast && (
        <div className="mg-toast" onClick={clearToast}>
          <span className="mg-toast-icon">
            <Icon name={toast.icon} size={24} />
          </span>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
          </div>
        </div>
      )}

      {helpOpen && (
        <div className="mg-modal-overlay" onClick={() => setHelpOpen(false)}>
          <div className="mg-modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="mg-modal-head">
              <h2>Keyboard shortcuts</h2>
              <button className="mg-modal-close" onClick={() => setHelpOpen(false)} aria-label="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="mg-modal-body mg-help">
              <div><kbd>1</kbd>–<kbd>9</kbd><span>Switch view</span></div>
              <div><kbd>?</kbd><span>Toggle this help</span></div>
              <div><kbd>Esc</kbd><span>Close menus / dialogs</span></div>
            </div>
          </div>
        </div>
      )}

      {navOpen && <div className="mg-scrim" onClick={() => setNavOpen(false)} />}
    </div>
  )
}