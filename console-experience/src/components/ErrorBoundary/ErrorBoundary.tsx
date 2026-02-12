/**
 * Error Boundary Component
 *
 * Catches React errors and prevents full app crashes.
 * Displays fallback UI instead of white screen.
 */

import './ErrorBoundary.css';

import { AlertTriangle } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

import { IconWrapper } from '@/components/core/IconWrapper/IconWrapper';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches rendering errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-container">
          <IconWrapper size="xxl">
            <AlertTriangle />
          </IconWrapper>
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
