import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class HeroChatBoxBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[HeroChatBox] runtime error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="relative w-full max-w-2xl mx-auto rounded-xl border border-destructive/40 bg-card/80 backdrop-blur-xl p-6 text-center space-y-3"
      >
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
          </div>
        </div>
        <h2 className="font-display text-sm font-semibold tracking-wide uppercase text-foreground">
          Chat temporarily unavailable
        </h2>
        <p className="text-xs text-muted-foreground">
          Something went wrong loading the SimPilot AI chat. The rest of the page is still working.
        </p>
        {this.state.error?.message && (
          <p className="text-[10px] text-muted-foreground/70 font-mono break-all">
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={this.handleReset}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:shadow-[0_0_15px_hsl(var(--cyan-glow)/0.3)] transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Try again
        </button>
      </div>
    );
  }
}

export default HeroChatBoxBoundary;
