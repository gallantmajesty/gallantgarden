import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  resetKeys?: readonly (string | number)[]
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo)
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.hasError) return
    if (!prevProps.resetKeys || !this.props.resetKeys) return
    if (prevProps.resetKeys.length !== this.props.resetKeys.length) return
    if (prevProps.resetKeys.some((v, i) => v !== this.props.resetKeys![i])) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      )
    }
    return this.props.children
  }
}
