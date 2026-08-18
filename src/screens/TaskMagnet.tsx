import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useMagnet } from '../store/magnet'
import { getTheme } from '../lib/magnet/themes'
import { Icon } from '../components/magnet/Icon'
import { PngIcon, type PngIconName } from '../components/PngIcon'
import { ThemeBackdrop } from '../components/magnet/ThemeBackdrop'
import { Dashboard } from '../components/magnet/views/Dashboard'
import { TasksView } from '../components/magnet/views/TasksView'
import { AnalyticsView } from '../components/magnet/views/AnalyticsView'
import { GoalsView } from '../components/magnet/views/GoalsView'
import { CalendarView } from '../components/magnet/views/CalendarView'
import { MagnetLoader } from '../components/magnet/MagnetLoader'

import './TaskMagnet.css'

export type MagnetView =
  | 'dashboard'
  | 'tasks'
  | 'analytics'
  | 'goals'
  | 'habits'
  | 'calendar'

export function TaskMagnet() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const hydrate = useMagnet((s) => s.hydrate)
  const data = useMagnet((s) => s.data)
  // Full-screen "send-off" loader while the world hydrates; dismissed by the
  // loader itself once the data is ready (with a built-in safety timeout so it
  // can never get stuck on screen).
  const [loaderDone, setLoaderDone] = useState(false)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The applied magnet theme owns the whole world: replace the fixed coffee
  // palette with the active theme's vars (gradients, particles and the scene
  // layer render through ThemeBackdrop behind the translucent panels).
  const rootStyle = useMemo(() => {
    const v = getTheme(data.theme).vars
    return {
      ['--mg-bg' as string]: v.bg,
      ['--mg-glow-a']: v.glowA,
      ['--mg-glow-b']: v.glowB,
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
  }, [data.theme, data.font])

  const activeTheme = useMemo(() => getTheme(data.theme), [data.theme])

  const NAV: { key: MagnetView; label: string; icon: string; png?: PngIconName }[] = [
    { key: 'dashboard', label: t('taskMagnet.navDashboard'), icon: 'home' },
    { key: 'analytics', label: t('taskMagnet.navAnalytics'), icon: 'chart', png: 'analytics' },
    { key: 'tasks', label: t('taskMagnet.navTasks'), icon: 'check', png: 'tasks' },
    { key: 'calendar', label: t('taskMagnet.navCalendar'), icon: 'calendar' },
    { key: 'goals', label: t('taskMagnet.navGoals'), icon: 'target', png: 'goals' },
  ]

  const profileName = useProfile((s) => s.displayName)
  const displayName =
    (profileName && profileName !== 'Explorer' ? profileName : null) ||
    user?.profile?.name ||
    user?.email?.split('@')[0] ||
    t('auth.defaultName')

  return (
    <div className={`mg-root dark mg-theme-${activeTheme.id}`} style={rootStyle}>
      <ThemeBackdrop theme={activeTheme} density={0.7} accent={activeTheme.vars.accent2} />

      <aside className={`mg-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="mg-sidebar-top">
          <button className="mg-back" onClick={() => navigate(-1)}>
            <Icon name="back" size={18} /> {t('common.lobby')}
          </button>
          <button className="mg-burger" onClick={() => setNavOpen((o) => !o)} aria-label={t('taskMagnet.menu')}>
            <Icon name={navOpen ? 'close' : 'chevron'} size={20} />
          </button>
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

        <div className="mg-brand mg-brand-bottom">
          <span className="mg-brand-orb">
            <img className="mg-brand-logo-img" src="/task-mgmt-logo.png" alt="Task Magnet" />
          </span>
          <div>
            <strong>{t('taskMagnet.brand')}</strong>
            <small>Task Magnet</small>
          </div>
        </div>
      </aside>

      <main className="mg-main">
        <div className="mg-content">
          {view === 'dashboard' && <Dashboard name={displayName} onNavigate={setView} />}
          {view === 'tasks' && (
            <TasksView prefillDue={prefillDue} onPrefillDue={() => setPrefillDue(null)} />
          )}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'goals' && <GoalsView />}
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

      {!loaderDone && <MagnetLoader onDone={() => setLoaderDone(true)} />}
    </div>
  )
}