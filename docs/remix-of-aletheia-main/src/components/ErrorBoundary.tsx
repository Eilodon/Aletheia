import React, { Component, ErrorInfo, ReactNode } from "react";
import ScreenContainer from "@/components/ScreenContainer";
import Ornament from "@/components/Ornament";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScreenContainer>
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
            <Ornament variant="sigil" size="lg" />
            <h1 className="text-lg font-serif text-gold-gradient tracking-[0.2em] font-vi">
              Đã có lỗi xảy ra
            </h1>
            <p className="text-xs text-muted-foreground/40 text-center font-body italic leading-relaxed max-w-xs">
              Something unexpected happened. Please refresh the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="px-6 py-2.5 rounded-sm ornate-border bg-gradient-to-b from-gold/10 to-transparent
                         text-gold font-serif text-xs tracking-[0.2em] uppercase
                         hover:arcane-glow transition-all duration-500"
            >
              Quay lại
            </button>
          </div>
        </ScreenContainer>
      );
    }

    return this.props.children;
  }
}
