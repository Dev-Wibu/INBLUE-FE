import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { SpinnerButton } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { authManager } from "@/services/auth.manager";
import { Eye, EyeOff, KeyRound, RotateCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ForgotPasswordShell } from "./ForgotPasswordShell";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(queryEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const cooldownTimerRef = useRef<number | null>(null);

  const clearCooldownTimer = useCallback(() => {
    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  const startCooldown = useCallback(() => {
    clearCooldownTimer();
    setCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearCooldownTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCooldownTimer]);

  useEffect(() => {
    return clearCooldownTimer;
  }, [clearCooldownTimer]);

  const passwordRule = useMemo(() => newPassword.length >= 6, [newPassword]);
  const passwordsMatch = useMemo(
    () => newPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );
  const canSubmit =
    email.trim().length > 0 && otp.length === OTP_LENGTH && passwordsMatch && passwordRule;

  const handleResend = async () => {
    if (cooldown > 0 || isResending) {
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("authResetpasswordpage.pleaseEnterEmail"));
      return;
    }
    setError("");
    setInfo("");
    setIsResending(true);
    const result = await authManager.forgotPassword({ email: trimmedEmail });
    setIsResending(false);

    if (!result.success) {
      setError(result.error || t("authForgotpasswordpage.sendOtpFailed"));
      return;
    }
    setInfo(result.data?.message || t("authForgotpasswordpage.otpSentDefault"));
    setOtp("");
    startCooldown();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("authResetpasswordpage.pleaseEnterEmail"));
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      setError(t("authResetpasswordpage.pleaseEnterFullOtp"));
      return;
    }
    if (!passwordRule) {
      setError(t("authResetpasswordpage.passwordTooShort"));
      return;
    }
    if (!passwordsMatch) {
      setError(t("authSignuppage.confirmationPasswordDoesNotMatch"));
      return;
    }

    setIsSubmitting(true);
    const result = await authManager.resetPassword({
      email: trimmedEmail,
      otp,
      newPassword,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || t("authResetpasswordpage.resetFailed"));
      return;
    }

    navigate("/login", {
      replace: true,
      state: {
        message:
          result.data?.message && result.data.message.trim().length > 0
            ? result.data.message
            : t("authResetpasswordpage.resetSuccessDefault"),
        prefillEmail: trimmedEmail,
      },
    });
  };

  const inputClassName =
    "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0047AB]/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:ring-[#66B2FF]/35";

  return (
    <ForgotPasswordShell
      stepLabel={t("authResetpasswordpage.step2Badge")}
      stepIndex={1}
      totalSteps={2}
      title={
        <>
          {t("authResetpasswordpage.heroTitleLine1")}{" "}
          <span className="text-[#66B2FF]">{t("authResetpasswordpage.heroTitleLine2")}</span>
        </>
      }
      description={t("authResetpasswordpage.heroDescription")}
      highlight={
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <span className="leading-relaxed text-slate-200">
            {t("authResetpasswordpage.heroHighlight")}
          </span>
        </div>
      }>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {t("authResetpasswordpage.heading")}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t("authResetpasswordpage.subheading")}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="dark:text-slate-300">
            {t("common.email")}
          </Label>
          <Input
            id="reset-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("common.emailExample")}
            autoComplete="email"
            required
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="reset-otp" className="dark:text-slate-300">
              {t("authResetpasswordpage.otpCode")}
            </Label>
            {cooldown > 0 ? (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("authResetpasswordpage.resendIn", { seconds: cooldown })}
              </span>
            ) : null}
          </div>
          <InputOTP
            id="reset-otp"
            value={otp}
            onChange={(value) => setOtp(value)}
            maxLength={OTP_LENGTH}
            autoComplete="one-time-code"
            inputMode="numeric"
            containerClassName="justify-center">
            <InputOTPGroup>
              {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
                <InputOTPSlot
                  key={idx}
                  index={idx}
                  className="size-11 border-slate-200 bg-white text-base font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("authResetpasswordpage.otpHelp")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-new-password" className="dark:text-slate-300">
            {t("authResetpasswordpage.newPassword")}
          </Label>
          <div className="relative">
            <Input
              id="reset-new-password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t("authResetpasswordpage.newPasswordPlaceholder")}
              autoComplete="new-password"
              required
              className={cn("pr-10", inputClassName)}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? t("common.hidePassword") : t("common.showPassword")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300">
              {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p
            className={cn(
              "text-xs",
              newPassword.length === 0
                ? "text-slate-500 dark:text-slate-400"
                : passwordRule
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-red-600 dark:text-red-300"
            )}>
            {t("authResetpasswordpage.passwordRule")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password" className="dark:text-slate-300">
            {t("common.confirmPassword")}
          </Label>
          <div className="relative">
            <Input
              id="reset-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("common.reenterThePassword")}
              autoComplete="new-password"
              required
              className={cn("pr-10", inputClassName)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? t("common.hidePassword") : t("common.showPassword")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300">
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {info ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
            {info}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full bg-[#0047AB] text-white hover:bg-[#003A8C] dark:bg-[#005FD1] dark:hover:bg-[#4A90FF]">
            {isSubmitting ? (
              <SpinnerButton label={t("authResetpasswordpage.resetting")} />
            ) : (
              <>
                <KeyRound className="size-4" />
                {t("authResetpasswordpage.resetPassword")}
              </>
            )}
          </Button>

          <div className="flex flex-col items-center gap-2 text-sm text-slate-600 sm:flex-row sm:justify-between dark:text-slate-400">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className={cn(
                "inline-flex items-center gap-1.5 font-medium transition-colors",
                cooldown > 0 || isResending
                  ? "cursor-not-allowed text-slate-400 dark:text-slate-600"
                  : "text-[#0047AB] hover:underline dark:text-[#66B2FF]"
              )}>
              <RotateCw
                className={cn(
                  "size-3.5",
                  isResending && "animate-spin",
                  cooldown === 0 && "group-hover:rotate-180"
                )}
              />
              {cooldown > 0
                ? t("authResetpasswordpage.resendIn", { seconds: cooldown })
                : t("authResetpasswordpage.resendOtp")}
            </button>
            <Link
              to="/forgot-password"
              className="font-medium text-[#0047AB] hover:underline dark:text-[#66B2FF]">
              {t("authResetpasswordpage.changeEmail")}
            </Link>
          </div>
        </div>
      </form>
    </ForgotPasswordShell>
  );
}
