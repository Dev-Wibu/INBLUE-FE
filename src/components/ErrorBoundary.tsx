import { Button } from "@/components/ui/button";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryInner extends Component<Props & WithTranslation, State> {
  constructor(props: Props & WithTranslation) {
    super(props);
    this.state = {
      hasError: false,
    };
  }
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Future: Send to monitoring service (Sentry, etc.)
  }
  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        this.props.fallback || (
          <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <h2 className="mb-4 text-2xl font-bold">{t("common.anErrorHasOccurred")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("compErrorboundary.theApplicationCrashesPleaseReload")}
            </p>
            <Button onClick={() => window.location.reload()}>{t("common.reloadThePage")}</Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);
