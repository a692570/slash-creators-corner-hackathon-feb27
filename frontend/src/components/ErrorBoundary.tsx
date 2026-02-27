import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-[#888] mb-6">
              The app encountered an error. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-[#00ff88] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#00dd77]"
            >
              Go to Dashboard
            </button>
            {this.state.error && (
              <details className="mt-6">
                <summary className="text-[#666] text-sm cursor-pointer">Error details</summary>
                <pre className="mt-2 text-xs text-[#666] overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
