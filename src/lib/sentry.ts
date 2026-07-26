/**
 * Sentry error monitoring — optional dependency.
 *
 * To enable: run `npm install @sentry/react` and set VITE_SENTRY_DSN in .env.local
 * If @sentry/react is not installed, all functions are no-ops.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let sentryApi: any = null
let isInitialized = false

async function loadSentry(): Promise<any> {
  try {
    // Dynamic import — only resolves if the package is installed
    return await import(/* @vite-ignore */ '@sentry/react')
  } catch {
    return null
  }
}

export async function initSentry(): Promise<void> {
  if (isInitialized) return

  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  const Sentry = await loadSentry()
  if (!Sentry) {
    console.warn('[Sentry] @sentry/react not installed — error monitoring disabled')
    return
  }

  sentryApi = Sentry

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.browserTracingIntegration?.() ?? Sentry.BrowserTracing,
    ].filter(Boolean),
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    beforeSend(event: any, hint: any) {
      const error = hint?.originalException
      if (error instanceof Error) {
        if (error.message.includes('WebSocket') && error.message.includes('close')) return null
        if (error.name === 'AbortError') return null
      }
      return event
    },
  })

  isInitialized = true
}

export async function setSentryUser(user: { id: string; email?: string; username?: string } | null): Promise<void> {
  sentryApi?.setUser(user)
}

export async function captureError(error: Error, context?: Record<string, unknown>): Promise<void> {
  if (sentryApi) {
    sentryApi.captureException(error, { extra: context })
  } else {
    console.error('[Error]', error, context)
  }
}

export async function captureMessage(message: string, level: string = 'info'): Promise<void> {
  sentryApi?.captureMessage(message, level)
}

export async function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): Promise<void> {
  sentryApi?.addBreadcrumb({ category, message, data, type: 'default' })
}