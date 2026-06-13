import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useMagnet } from '../store/magnet'
import { getTheme } from '../lib/magnet/themes'
import { levelProgress } from '../lib/magnet/types'
import { ThemeBackdrop } from '../components/magnet/ThemeBackdrop'
import { Icon } from '../components/magnet/Icon'
import { Dashboard } from '../components/magnet/views/Dashboard'
import { TasksView } from '../components/magnet/views/TasksView'
import { AnalyticsView } from '../components/magnet/views/AnalyticsView'
import { GoalsView } from '../components/magnet/views/GoalsView'
import { HabitsView } from '../components/magnet/views/HabitsView'
import { JournalView } from '../components/magnet/views/JournalView'
import { SanctuaryView } from '../components/magnet/views/SanctuaryView'
import { ThemesView } from '../components/magnet/views/ThemesView'
import './TaskMagnet.css'

export type MagnetView =
  | 'dashboard'
  | 'tasks'
  | 'analytics'
  | 'goals'
  | 'habits'
  | 'journal'
  | 'sanctuary'
  | 'themes'

const NAV: { key: MagnetView; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Headquarters', icon: 'home' },
  { key: 'tasks', label: 'Tasks', icon: 'check' },
  { key: 'analytics', label: 'Analytics', icon: 'chart' },
  { key: 'goals', label: 'Goals & Dreams', icon: 'target' },
  { key: 'habits', label: 'Habits', icon: 'fire' },
  { key: 'journal', label: 'Journal', icon: 'journal' },
  { key: 'sanctuary', label: 'Sanctuary', icon: 'vault' },
  { key: 'themes', label: 'Personalize', icon: 'palette' },
]

export function TaskMagnet() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const hydrate = useMagnet((s) => s.hydrate)
  const ready = useMagnet((s) => s.ready)
  const data = useMagnet((s) => s.data)
  const toast = useMagnet((s) => s.toast)
  const clearToast = useMagnet((s) => s.clearToast)

  const [view, setView] = useState<MagnetView>('dashboard')
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (user?.id) hydrate(user.id)
  }, [user?.id, hydrate])

  // auto-dismiss the unlock / level-up toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 4200)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  const theme = getTheme(data.themeId)
  const accent = data.accent ?? theme.vars.accent

  const rootStyle = useMemo(() => {
    const v = theme.vars
    return {
      ['--mg-bg' as string]: v.bg,
      ['--mg-panel']: v.panel,
      ['--mg-panel-soft']: v.panelSoft,
      ['--mg-border']: v.border,
      ['--mg-text']: v.text,
      ['--mg-text-soft']: v.textSoft,
      ['--mg-accent']: accent,
      ['--mg-accent2']: data.accent ?? v.accent2,
      ['--mg-shadow']: v.shadow,
      fontFamily: data.font === 'Inter' ? 'var(--sans)' : `${data.font}, var(--sans)`,
    } as React.CSSProperties
  }, [theme, accent, data.accent, data.font])

  const displayName = user?.profile?.name || user?.email?.split('@')[0] || 'Explorer'
  const lp = levelProgress(data.xp)

  if (!ready) {
    return (
      <div className="mg-root mg-loading" style={rootStyle}>
        <ThemeBackdrop theme={theme} density={data.particleDensity} accent={data.accent} />
        <div className="mg-loading-card">Opening your world…</div>
      </div>
    )
  }

  return (
    <div className={`mg-root ${theme.dark ? 'dark' : 'light'}`} style={rootStyle}>
      <ThemeBackdrop theme={theme} density={data.particleDensity} accent={data.accent} />

      {/* ---------------- sidebar ---------------- */}
      <aside className={`mg-sidebar ${navOpen ? 'open' : ''}`}>
        <button className="mg-back" onClick={() => navigate('/')}>
          <Icon name="back" size={18} /> Lobby
        </button>

        <div className="mg-brand">
          <span className="mg-brand-orb">
            <Icon name="spark" size={20} />
          </span>
          <div>
            <strong>Task Magnet</strong>
            <small>{theme.name}</small>
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
              <Icon name={n.icon} size={20} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="mg-levelcard">
          <div className="mg-levelcard-top">
            <span className="mg-levelbadge">Lv {lp.level}</span>
            <span className="mg-levelxp">{data.xp} XP</span>
          </div>
          <div className="mg-levelbar">
            <div className="mg-levelbar-fill" style={{ width: `${lp.pct * 100}%` }} />
          </div>
          <small>{lp.span - lp.into} XP to level {lp.level + 1}</small>
        </div>
      </aside>

      {/* ---------------- main ---------------- */}
      <main className="mg-main">
        <header className="mg-topbar">
          <button className="mg-burger" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">
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
          {view === 'tasks' && <TasksView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'goals' && <GoalsView />}
          {view === 'habits' && <HabitsView />}
          {view === 'journal' && <JournalView />}
          {view === 'sanctuary' && <SanctuaryView />}
          {view === 'themes' && <ThemesView />}
        </div>
      </main>

      {/* ---------------- unlock / level-up toast ---------------- */}
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

      {navOpen && <div className="mg-scrim" onClick={() => setNavOpen(false)} />}
    </div>
  )
}
