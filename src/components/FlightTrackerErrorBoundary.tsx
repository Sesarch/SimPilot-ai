import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class FlightTrackerErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("FlightTrackerMap crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/30 rounded-lg border border-border p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <h3 className="text-base text-foreground mb-1">Flight Tracker encountered an error</h3>
            <p className="text-sm text-muted-foreground">Something went wrong while rendering the map.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default FlightTrackerErrorBoundary;
