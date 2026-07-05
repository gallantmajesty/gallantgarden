import React, { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  resetKeys?: (string | number)[]
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[ErrorBoundary] caught a render error:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKeys && this.props.resetKeys) {
      const changed = prev.resetKeys.length !== this.props.resetKeys.length
        || prev.resetKeys.some((v, i) => v !== this.props.resetKeys[i])
      if (changed) this.setState({ error: null })
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1410', color: '#e8efe6', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ opacity: 0.75, marginBottom: 16 }}>{error.message}</p>
          <button
            onClick={this.reset}
            style={{ padding: '10px 20px', borderRadius: 8, background: '#2a3a2e', color: '#e8efe6', border: '1px solid #4a5a4e', cursor: 'pointer' }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', borderRadius: 8, background: '#2a3a2e', color: '#e8efe6', border: '1px solid #4a5a4e', cursor: 'pointer', marginLeft: 8 }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
