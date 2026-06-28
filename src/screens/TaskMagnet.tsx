import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useMagnet } from '../store/magnet'
import { getTheme } from '../lib/magnet/themes'
import { levelProgress } from '../lib/magnet/types'
import { ThemeBackdrop } from '../components/magnet/ThemeBackdrop'
import { Icon } from '../components/magnet/Icon'
import { PngIcon, type PngIconName } from '../components/PngIcon'
import { Dashboard } from '../components/magnet/views/Dashboard'
import { TasksView } from '../components/magnet/views/TasksView'
import { AnalyticsView } from '../components/magnet/views/AnalyticsView'
import { GoalsView } from '../components/magnet/views/GoalsView'
import { HabitsView } from '../components/magnet/views/HabitsView'
import { SanctuaryView } from '../components/magnet/views/SanctuaryView'
import { ThemesView } from '../components/magnet/views/ThemesView'
import './TaskMagnet.css'

export type MagnetView =
  | 'dashboard'
  | 'tasks'
  | 'analytics'
  | 'goals'
  | 'habits'
  | 'sanctuary'
  | 'themes'

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

  useEffect(() => {
    if (user?.id) hydrate(user.id)
  }, [user?.id, hydrate])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(clearToast, 4200)
    return () => clearTimeout(timer)
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

  const NAV: { key: MagnetView; label: string; icon: string; png?: PngIconName }[] = [
    { key: 'dashboard', label: t('taskMagnet.navDashboard'), icon: 'home' },
    { key: 'tasks', label: t('taskMagnet.navTasks'), icon: 'check', png: 'tasks' },
    { key: 'analytics', label: t('taskMagnet.navAnalytics'), icon: 'chart', png: 'analytics' },
    { key: 'goals', label: t('taskMagnet.navGoals'), icon: 'target', png: 'goals' },
    { key: 'habits', label: t('taskMagnet.navHabits'), icon: 'fire', png: 'habits' },
    { key: 'sanctuary', label: t('taskMagnet.navSanctuary'), icon: 'vault', png: 'achievements' },
    { key: 'themes', label: t('taskMagnet.navThemes'), icon: 'palette', png: 'settings' },
  ]

  const profileName = useProfile((s) => s.displayName)
  const displayName =
    (profileName && profileName !== 'Explorer' ? profileName : null) ||
    user?.profile?.name ||
    user?.email?.split('@')[0] ||
    t('auth.defaultName')
  const lp = levelProgress(data.xp)

  if (!ready) {
    return (
      <div className="mg-root mg-loading" style={rootStyle}>
        <ThemeBackdrop theme={theme} density={data.particleDensity} accent={data.accent} />
        <div className="mg-loading-card">{t('taskMagnet.openingWorld')}</div>
      </div>
    )
  }

  return (
    <div className={`mg-root ${theme.dark ? 'dark' : 'light'}`} style={rootStyle}>
      <ThemeBackdrop theme={theme} density={data.particleDensity} accent={data.accent} />

      <aside className={`mg-sidebar ${navOpen ? 'open' : ''}`}>
        <button className="mg-back" onClick={() => navigate('/')}>
          <Icon name="back" size={18} /> {t('common.lobby')}
        </button>

        <div className="mg-brand">
          <span className="mg-brand-orb">
            <Icon name="spark" size={20} />
          </span>
          <div>
            <strong>{t('taskMagnet.brand')}</strong>
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
              {n.png ? (
                <PngIcon name={n.png} size={24} className="mg-navpng" />
              ) : (
                <Icon name={n.icon} size={20} />
              )}
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="mg-levelcard">
          <div className="mg-levelcard-top">
            <span className="mg-levelbadge">{t('taskMagnet.level', { level: lp.level })}</span>
            <span className="mg-levelxp">{t('taskMagnet.xpValue', { xp: data.xp })}</span>
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
          {view === 'tasks' && <TasksView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'goals' && <GoalsView />}
          {view === 'habits' && <HabitsView />}
          {view === 'sanctuary' && <SanctuaryView />}
          {view === 'themes' && <ThemesView />}
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

      {navOpen && <div className="mg-scrim" onClick={() => setNavOpen(false)} />}
    </div>
  )
}