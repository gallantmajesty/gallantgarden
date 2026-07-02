import { Component, type ErrorInfo, type ReactNode } from 'react'
import { withTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
  resetKeys?: unknown[]
  fallback?: (error: Error, reset: () => void) => ReactNode
  t: TFunction
}

interface State {
  error: Error | null
}

class ErrorBoundaryBase extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] caught a render error:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && !shallowEqual(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null })
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)

    const { t } = this.props
    return (
      <div className="eb-root" role="alert">
        <div className="eb-card">
          <img className="eb-logo" src="/icons/focus-lily-logo.png" alt="" width={56} height={56} />
          <h1>{t('errorBoundary.title')}</h1>
          <p>{t('errorBoundary.description')}</p>
          <details className="eb-details">
            <summary>{t('errorBoundary.technicalDetails')}</summary>
            <pre>{error.message}</pre>
          </details>
          <div className="eb-actions">
            <button className="eb-btn primary" onClick={this.reset}>
              {t('errorBoundary.tryAgain')}
            </button>
            <button className="eb-btn" onClick={() => window.location.reload()}>
              {t('errorBoundary.reload')}
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase)

function shallowEqual(a?: unknown[], b?: unknown[]): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  return a.every((v, i) => Object.is(v, b[i]))
}