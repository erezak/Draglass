import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallbackTitle?: string
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  private onWindowError = (event: ErrorEvent) => {
    if (this.state.error) return
    const error = event.error instanceof Error ? event.error : new Error(String(event.message))
    this.setState({ error })
  }

  private onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (this.state.error) return
    const reason = event.reason
    const error = reason instanceof Error ? reason : new Error(String(reason))
    this.setState({ error })
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidMount() {
    window.addEventListener('error', this.onWindowError)
    window.addEventListener('unhandledrejection', this.onUnhandledRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.onWindowError)
    window.removeEventListener('unhandledrejection', this.onUnhandledRejection)
  }

  componentDidCatch(error: Error, info: unknown) {
    // Keep console logging for devtools / tauri logs.
    console.error('Unhandled UI error', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="error" style={{ whiteSpace: 'pre-wrap' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          {this.props.fallbackTitle ?? 'Something went wrong'}
        </div>
        <div style={{ marginBottom: 8 }}>{String(error.message || error)}</div>
        {error.stack ? (
          <details>
            <summary>Stack</summary>
            <pre style={{ marginTop: 8 }}>{error.stack}</pre>
          </details>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}
