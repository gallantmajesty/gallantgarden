import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[LavaPad] Scene crashed:', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="lava-pad-error">
          <div className="lava-pad-error-card water-glass">
            <span className="lava-pad-error-icon">!</span>
            <h2>Something went wrong</h2>
            <p>The game scene encountered an error. Please try again.</p>
            <button className="sf-btn" onClick={this.handleRetry}>Retry</button>
          </div>
          <style>{`
            .lava-pad-error {
              position: absolute; inset: 0; display: grid; place-items: center;
              background: #0a0618; padding: 24px;
            }
            .lava-pad-error-card {
              text-align: center; padding: 40px; border-radius: 24px;
              max-width: 360px; width: 100%;
            }
            .lava-pad-error-icon {
              width: 56px; height: 56px; border-radius: 50%; display: grid;
              place-items: center; margin: 0 auto 16px;
              background: rgba(200,40,20,0.9); color: white;
              font-size: 28px; font-weight: 800;
            }
            .lava-pad-error-card h2 {
              font-family: var(--display); font-weight: 800; font-size: 20px;
              color: var(--ink); margin: 0 0 8px;
            }
            .lava-pad-error-card p {
              color: var(--ink-soft); font-size: 14px; margin: 0 0 24px;
            }
          `}</style>
        </div>
      )
    }
    return this.props.children
  }
}
