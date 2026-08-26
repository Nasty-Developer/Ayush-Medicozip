/**
 * ErrorBoundary — catches render-time errors anywhere in the component tree
 * below it, displays a user-friendly fallback, and logs to console.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePageOrComponent />
 *   </ErrorBoundary>
 *
 *   // With a custom fallback:
 *   <ErrorBoundary fallback={<MyCustomError />}>
 *     <SomePageOrComponent />
 *   </ErrorBoundary>
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label for diagnostics (e.g. "CheckoutPage") */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const label = this.props.label ?? "component";
    console.error(`[ErrorBoundary] Uncaught error in ${label}:`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-5 px-4 text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              An unexpected error occurred. Please try refreshing the page, or{" "}
              <a href="tel:+919833273838" className="text-primary hover:underline font-medium">
                call us
              </a>{" "}
              if the problem persists.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white
                         text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={14} /> Try Again
            </button>
            <button
              onClick={() => window.location.replace("/")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border
                         text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              Go to Home
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="max-w-lg text-left mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Error details (dev mode)
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-muted text-xs text-destructive overflow-auto whitespace-pre-wrap">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
