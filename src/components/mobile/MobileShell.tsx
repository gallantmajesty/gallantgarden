import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './MobileShell.css'
import './mobile.css'

export interface MobileShellProps {
  title?: string
  showBack?: boolean
  onBack?: () => void
  /** Hide the bottom tab bar (e.g. for full-screen editors). */
  hideNav?: boolean
  /** Extra node rendered on the right of the top app bar (before the action buttons). */
  action?: ReactNode
  children: ReactNode
}

const TABS = [
  { id: 'home', label: 'Home', path: '/lobby', icon: 'M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { id: 'explore', label: 'Explore', path: '/lobby/explore', icon: 'M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
  { id: 'notes', label: 'Notes', path: '/notes', icon: 'M5 3h11l3 3v15H5z M16 3v3h3 M8 8h8 M8 12h8 M8 16h5' },
  { id: 'shop', label: 'Shop', path: '/shop', icon: 'M4 7h16l-1 11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z M4 7l1-3h14l1 3 M9 11v4 M15 11v4' },
  { id: 'profile', label: 'Profile', path: '/profile', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0' },
] as const

function isActive(path: string, current: string): boolean {
  if (path === '/lobby') return current === '/lobby' || (current.startsWith('/lobby') && !current.startsWith('/lobby/realm'))
  return current === path || current.startsWith(path + '/')
}

/**
 * Mobile app chrome: a minimal top app bar + a 5-tab bottom navigation
 * (Home, Explore, Notes, Shop, Profile). THIS is the fresh, minimal mobile
 * design system — it deliberately does NOT use the desktop web-theme
 * (WebBackground / WebTheme). Wrap any interior screen's mobile branch in
 * <MobileShell>. The only top-bar actions are Messages and Settings — no
 * generic "menu" hamburger, since that feature doesn't exist yet.
 */
export function MobileShell({ title, showBack, onBack, hideNav, action, children }: MobileShellProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="ms-root">
      <header className="ms-appbar">
        <div className="ms-appbar-inner">
          {showBack ? (
            <button className="ms-icon-btn" onClick={onBack ?? (() => navigate(-1))} aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <div className="ms-brand">
              <img src="/icons/focus-lily-logo.png" alt="" width={22} height={22} />
              <span>FocusLily</span>
            </div>
          )}
          {title && <h1 className="ms-title">{title}</h1>}
          <div className="ms-appbar-action">
            {action}
            <button className="ms-icon-btn" onClick={() => window.dispatchEvent(new CustomEvent('sf:open-chat'))} aria-label="Messages">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
              </svg>
            </button>
            <button className="ms-icon-btn" onClick={() => window.dispatchEvent(new CustomEvent('sf:open-control-center'))} aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="ms-content">{children}</main>

      {!hideNav && (
        <nav className="ms-tabbar" aria-label="Primary">
          {TABS.map((tab) => {
            const active = isActive(tab.path, location.pathname)
            return (
              <button
                key={tab.id}
                className={`ms-tab ${active ? 'on' : ''}`}
                onClick={() => navigate(tab.path)}
                aria-current={active ? 'page' : undefined}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
