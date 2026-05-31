import { isSessionExpired } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/authStore";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
const SESSION_CHECK_INTERVAL_MS = 30000;
export function SessionExpiryGuard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, isLoggedIn, expiresAt, clearAuth } = useAuthStore();
  const enforceSessionExpiry = useCallback(() => {
    if (isLoading || !isLoggedIn) {
      return;
    }
    if (!isSessionExpired(expiresAt)) {
      return;
    }
    clearAuth();
    if (location.pathname !== "/login") {
      navigate("/login", {
        replace: true,
        state: {
          message: t("compShared.loginSessionHasExpiredPlease"),
        },
      });
    }
  }, [clearAuth, expiresAt, isLoading, isLoggedIn, location.pathname, navigate, t]);
  useEffect(() => {
    enforceSessionExpiry();
  }, [enforceSessionExpiry]);
  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    const timerId = window.setInterval(() => {
      enforceSessionExpiry();
    }, SESSION_CHECK_INTERVAL_MS);
    return () => {
      window.clearInterval(timerId);
    };
  }, [enforceSessionExpiry, isLoggedIn]);
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        enforceSessionExpiry();
      }
    };
    const handleFocus = () => {
      enforceSessionExpiry();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enforceSessionExpiry]);
  return null;
}
