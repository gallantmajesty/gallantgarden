// @ts-nocheck
// Notifications — lightweight, non-intrusive break/match/study notifications

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePomodoro } from '../../store/pomodoro'
import { useBreakIntegration } from './BreakIntegration'

type Notification = {
  id: string
  icon: string
  title: string
  body: string
  duration: number
}

let notifId = 0

export function Notifications() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const phase = useBreakIntegration((s) => s.phase)
  const breakTimeRemaining = useBreakIntegration((s) => s.breakTimeRemaining)
  const dismissBreakNotification = useBreakIntegration((s) => s.dismissBreakNotification)
  const showBreakNotification = useBreakIntegration((s) => s.showBreakNotification)

  const pomoMode = usePomodoro((s) => s.mode)

  // Break started notification
  useEffect(() => {
    if (showBreakNotification && pomoMode === 'break') {
      const id = `break-${++notifId}`
      setNotifications((prev) => [...prev, {
        id,
        icon: '🎉',
        title: t('games.notifications.breakStarted'),
        body: t('games.notifications.breakStartedBody'),
        duration: 6000,
      }])
      setTimeout(() => dismissBreakNotification(), 6000)
    }
  }, [showBreakNotification])

  // 30s remaining warning
  useEffect(() => {
    if (phase === 'break-ending' && breakTimeRemaining <= 30 && breakTimeRemaining > 0) {
      const id = `ending-${breakTimeRemaining}`
      setNotifications((prev) => {
        if (prev.some(n => n.id.startsWith('ending-'))) return prev
        return [...prev, {
          id,
          icon: '⏰',
          title: t('games.notifications.breakEnding'),
          body: t('games.notifications.breakEndingBody'),
          duration: 5000,
        }]
      })
    }
  }, [phase, breakTimeRemaining])

  // Break over — time to study
  useEffect(() => {
    if (pomoMode === 'study' && phase !== 'focus') {
      const id = `study-${++notifId}`
      setNotifications((prev) => [...prev, {
        id,
        icon: '🌱',
        title: t('games.notifications.timeToStudy'),
        body: t('games.notifications.timeToStudyBody'),
        duration: 8000,
      }])
    }
  }, [pomoMode])

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter(n => n.id !== id))
  }

  return (
    <div className="notifications-container">
      {notifications.map((n) => (
        <div key={n.id} className="notification-toast" onClick={() => dismiss(n.id)}>
          <span className="notification-icon">{n.icon}</span>
          <div className="notification-content">
            <span className="notification-title">{n.title}</span>
            <span className="notification-body">{n.body}</span>
          </div>
          <button className="notification-close" onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <style>{`
        .notifications-container {
          position: fixed; top: 20px; right: 20px; z-index: 100;
          display: flex; flex-direction: column; gap: 10px;
          max-width: 360px; width: 100%; pointer-events: none;
        }
        .notification-toast {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px; border-radius: 16px;
          background: var(--glass-fill-strong, rgba(30,25,45,0.92));
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          pointer-events: all;
          animation: notif-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
        }
        .notification-toast:hover { transform: translateY(-2px); }
        .notification-icon { font-size: 24px; flex-shrink: 0; margin-top: 2px; }
        .notification-content {
          display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;
        }
        .notification-title {
          font-family: var(--display); font-weight: 700; font-size: 14px;
          color: var(--ink, #e8ddd0);
        }
        .notification-body {
          font-size: 13px; color: var(--ink-soft, rgba(232,221,208,0.6));
          line-height: 1.4;
        }
        .notification-close {
          background: none; border: none; cursor: pointer;
          color: var(--ink-soft, rgba(232,221,208,0.4));
          padding: 2px; flex-shrink: 0; margin-top: 2px;
        }
        .notification-close:hover { color: var(--ink, #e8ddd0); }

        @keyframes notif-in {
          from { transform: translateX(100px) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes notif-out {
          to { transform: translateX(100px); opacity: 0; }
        }

        @media (max-width: 640px) {
          .notifications-container {
            top: 12px; right: 12px; left: 12px; max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
