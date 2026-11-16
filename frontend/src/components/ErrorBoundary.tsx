import { Component, type ErrorInfo, type ReactNode } from "react";
import { EmptyState, Button } from "./ui";

interface Props {
  children: ReactNode;
  /** Changing this value resets the boundary (e.g. on navigation). */
  resetKey?: unknown;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div>
        <EmptyState
          art="alert"
          tone="danger"
          title="Cet écran a rencontré une erreur"
          action={<Button size="sm" icon="refresh" onClick={() => this.setState({ error: null })}>Recharger l'écran</Button>}
        >
          {this.state.error.message}
        </EmptyState>
      </div>
    );
  }
}
