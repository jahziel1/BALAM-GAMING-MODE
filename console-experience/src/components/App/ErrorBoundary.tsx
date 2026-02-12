/**
 * @module components/App/ErrorBoundary
 *
 * Error Boundary for crash isolation in shell replacement.
 * Prevents component errors from crashing the entire Windows shell.
 */

import './ErrorBoundary.css';

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
        <div className="error-boundary-container">
          <h1 className="error-boundary-title">Oops! Something went wrong</h1>
          <p className="error-boundary-message">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <button className="error-boundary-button" onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
