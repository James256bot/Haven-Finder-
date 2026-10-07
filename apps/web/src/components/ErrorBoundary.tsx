import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
    // Future: send to Sentry / Bugsnag
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="container-page py-16 max-w-xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9 V13 M12 17 H12.01 M10.29 3.86 L1.82 18 A2 2 0 0 0 3.54 21 H20.46 A2 2 0 0 0 22.18 18 L13.71 3.86 A2 2 0 0 0 10.29 3.86 Z" />
          </svg>
        </div>
        <h1 className="h2 text-ink-900">Something went wrong</h1>
        <p className="text-ink-500 mt-3">
          We've logged the issue. Try refreshing or going back to the homepage.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={() => window.location.reload()} className="btn btn-primary btn-md">
            Refresh page
          </button>
          <a href="/" className="btn btn-secondary btn-md">Back to home</a>
        </div>
        {this.state.error && (
          <details className="mt-8 text-left">
            <summary className="text-xs text-ink-400 cursor-pointer hover:text-ink-600">Technical details</summary>
            <pre className="mt-3 text-xs bg-ink-100 rounded-lg p-3 overflow-auto text-ink-700 whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
