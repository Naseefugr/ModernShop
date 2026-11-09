import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error in ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl border-2 border-destructive/20 bg-card shadow-2xl space-y-6 text-center">
            {/* Warning Shield Icon */}
            <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-inner">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Something Unexpected Occurred
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                We encountered an unexpected runtime error. Your shopping cart and saved profile details remain completely safe.
              </p>
            </div>

            {/* Error Message Box */}
            {this.state.error && (
              <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-xs text-left font-mono space-y-1 overflow-x-auto">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Error: {this.state.error.message || "Unknown Application Exception"}</span>
                </div>
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-2 text-[10px] text-muted-foreground cursor-pointer">
                    <summary className="hover:underline font-semibold">View Technical Component Stack</summary>
                    <pre className="mt-1 p-2 rounded bg-muted/60 text-foreground overflow-x-auto max-h-36">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                size="lg"
                onClick={this.handleReset}
                className="gap-2 font-bold shadow-md"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Application</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={this.handleGoHome}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                <span>Return to Storefront</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
