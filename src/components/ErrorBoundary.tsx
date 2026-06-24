import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

// A top-level safety net. Focus Lily renders heavy WebGL scenes (the realm /
// explore worlds) and on some devices — notably mobile GPUs, low-memory phones,
// or browsers that block WebGL — a scene can throw mid-render. Without a boundary
// a single throw unmounts the whole React tree and the user sees a blank /
// "something went wrong" page with no way back. This boundary catches any render
// error, keeps the persistent background mounted, and offers a calm recovery
// card (Try again / Reload) instead of a dead screen.
//
// `resetKeys` lets callers force a recovery when context changes (e.g. on route
// change) so a one-off crash on one screen doesn't permanently wedge the app.

interface Props {
  children: ReactNode
  /** When any value here changes, a previously-caught error is cleared. */
  resetKeys?: unknown[]
  /** Optional custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to the console for debugging; no remote logging wired up yet.
    console.error('[ErrorBoundary] caught a render error:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    // Clear the error when the reset keys change (e.g. navigation), so the next
    // screen gets a fresh attempt rather than inheriting the crash.
    if (this.state.error && !shallowEqual(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null })
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <div className="eb-root" role="alert">
        <div className="eb-card">
          <img className="eb-logo" src="/icons/lotus.png" alt="" width={56} height={56} />
          <h1>Something hiccuped</h1>
          <p>
            A part of Focus Lily ran into a problem and stopped. Your data is safe — this is just the
            view. You can try again, or reload to start fresh.
          </p>
          <details className="eb-details">
            <summary>Technical details</summary>
            <pre>{error.message}</pre>
          </details>
          <div className="eb-actions">
            <button className="eb-btn primary" onClick={this.reset}>
              Try again
            </button>
            <button className="eb-btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}

function shallowEqual(a?: unknown[], b?: unknown[]): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  return a.every((v, i) => Object.is(v, b[i]))
}
