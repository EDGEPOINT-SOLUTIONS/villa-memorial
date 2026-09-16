"use client";

/** A minimal error boundary so a WebGL/driver failure shows a calm message
 * instead of a blank canvas (the design system's error state, not a crash). */
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback: ReactNode };
type State = { failed: boolean };

export class Park3dErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Development aid only — never surface an internal stack to a visitor.
    console.error("3D park failed to render", error, info.componentStack);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
