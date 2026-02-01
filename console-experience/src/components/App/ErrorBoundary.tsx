/**
 * @module components/App/ErrorBoundary
 *
 * Error Boundary for crash isolation in shell replacement.
 * Prevents component errors from crashing the entire Windows shell.
 */

import { Component, type ReactNode } from 'react';

/**
 * Props for ErrorBoundary component
 */
interface Props {
  /** Child components to wrap with error boundary */
  children: ReactNode;
}

/**
 * State for ErrorBoundary component
 */
interface State {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The error object if one was caught */
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * React Error Boundary that catches JavaScript errors in child components.
 * Critical for shell stability - prevents a single component crash from
 * taking down the entire Windows shell replacement.
 *
 * ## Features
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Shows fallback UI with reload option
 * - Logs errors to console for debugging
 * - Prevents shell crash cascade
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#fff',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ff4444' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.8 }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              background: '#0066ff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
