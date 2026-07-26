/**
 * Sentry error monitoring — stub.
 * Run `npm install @sentry/react` to enable, then replace this file with a
 * real implementation that dynamically loads the SDK.
 */

export async function initSentry(): Promise<void> {
  // no-op until @sentry/react is installed
}

export async function setSentryUser(_user: { id: string; email?: string; username?: string } | null): Promise<void> {}

export async function captureError(error: Error, context?: Record<string, unknown>): Promise<void> {
  console.error('[Error]', error, context)
}

export async function captureMessage(message: string, _level?: string): Promise<void> {
  console.warn('[Message]', message)
}

export async function addBreadcrumb(_category: string, _message: string, _data?: Record<string, unknown>): Promise<void> {}
