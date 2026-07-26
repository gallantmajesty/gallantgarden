import * as Sentry from '@sentry/react'
import { browserTracingIntegration } from '@sentry/tracing'

let isInitialized = false

export function initSentry(): void {
  if (isInitialized) return

  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN not set, skipping initialization')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      browserTracingIntegration({
        // Only trace user interactions and router changes
        tracePropagationTargets: ['localhost', /^https:\/\//],
      }),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    beforeSend(event, hint) {
      // Filter out known non-critical errors
      const error = hint.originalException
      if (error instanceof Error) {
        // Ignore network errors from Supabase realtime
        if (error.message.includes('WebSocket') && error.message.includes('close')) {
          return null
        }
        // Ignore abort errors
        if (error.name === 'AbortError') {
          return null
        }
      }
      return event
    },
  })

  isInitialized = true
}

export function setSentryUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!isInitialized) return
  Sentry.setUser(user)
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!isInitialized) return
  Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!isInitialized) return
  Sentry.captureMessage(message, level)
}

export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isInitialized) return
  Sentry.addBreadcrumb({ category, message, data, type: 'default' })
}