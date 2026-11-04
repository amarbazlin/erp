import React, { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

// ── Error boundary ───────────────────────────────────────────────────────────
// Catches render errors in child components so the user sees a message instead
// of a blank white screen.
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null, errorInfo: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center',
          padding: 24, color: 'var(--text-primary)',
        }}>
          <AlertTriangle size={48} color="#dc2626" />
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800, margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea6c00)', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary