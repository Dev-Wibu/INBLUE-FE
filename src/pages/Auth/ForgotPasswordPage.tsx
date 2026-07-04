import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerButton } from "@/components/ui/spinner";
import { authManager } from "@/services/auth.manager";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ForgotPasswordShell } from "./ForgotPasswordShell";

interface ForgotPasswordState {
  prefillEmail?: string;
  redirectTo?: string;
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as ForgotPasswordState;
  const [email, setEmail] = useState(() => state.prefillEmail ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("authForgotpasswordpage.pleaseEnterEmail"));
      return;
    }

    setIsLoading(true);
    const result = await authManager.forgotPassword({ email: trimmedEmail });
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || t("authForgotpasswordpage.sendOtpFailed"));
      return;
    }

    const target = state.redirectTo || `/reset-password?email=${encodeURIComponent(trimmedEmail)}`;
    navigate(target, {
      replace: true,
      state: { prefillEmail: trimmedEmail },
    });
  };

  return (
    <ForgotPasswordShell
      stepLabel={t("authForgotpasswordpage.step1Badge")}
      stepIndex={0}
      totalSteps={2}
      title={
        <>
          {t("authForgotpasswordpage.heroTitleLine1")}{" "}
          <span className="text-[#66B2FF]">{t("authForgotpasswordpage.heroTitleLine2")}</span>
        </>
      }
      description={t("authForgotpasswordpage.heroDescription")}
      highlight={
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-[#66B2FF]" />
          <span className="leading-relaxed text-slate-200">
            {t("authForgotpasswordpage.heroHighlight")}
          </span>
        </div>
      }>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {t("authForgotpasswordpage.heading")}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t("authForgotpasswordpage.subheading")}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="dark:text-slate-300">
            {t("common.email")}
          </Label>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("common.emailExample")}
            autoComplete="email"
            autoFocus
            required
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0047AB]/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:ring-[#66B2FF]/35"
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="w-full bg-[#0047AB] text-white hover:bg-[#003A8C] dark:bg-[#005FD1] dark:hover:bg-[#4A90FF]"
          disabled={isLoading}>
          {isLoading ? (
            <SpinnerButton label={t("authForgotpasswordpage.sendingOtp")} />
          ) : (
            <>
              {t("authForgotpasswordpage.sendOtp")}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 font-medium text-[#0047AB] hover:underline dark:text-[#66B2FF]">
            <ArrowLeft className="size-3.5" />
            {t("common.backToLogin")}
          </Link>
        </p>
      </form>
    </ForgotPasswordShell>
  );
}
