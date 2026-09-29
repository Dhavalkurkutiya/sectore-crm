/**
 * Error Boundary Component
 * Sectore 360 — Part 6 Production Readiness
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground font-mono mt-2 bg-muted px-3 py-1.5 rounded">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button onClick={() => window.location.reload()} size="sm">
            Reload Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
