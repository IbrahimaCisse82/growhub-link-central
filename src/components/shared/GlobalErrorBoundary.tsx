import { Component, ErrorInfo, ReactNode } from "react";
import { logClientError } from "@/hooks/useSystemHealth";

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export default class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void logClientError({
      message: error.message,
      stack: error.stack,
      severity: "fatal",
      context: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold mb-2">Une erreur est survenue</h1>
            <p className="text-sm text-muted-foreground mb-4">{this.state.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
