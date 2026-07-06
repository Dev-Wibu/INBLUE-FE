import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import { userManager } from "@/services";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const INPUT_CLASSES =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#0047AB] focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

const PASSWORD_REQUIREMENTS = [
  {
    key: "length",
    labelKey: "changePassword.strengthLength",
    test: (value: string) => value.length >= 8,
  },
  {
    key: "lower",
    labelKey: "changePassword.strengthLower",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    key: "upper",
    labelKey: "changePassword.strengthUpper",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    key: "number",
    labelKey: "changePassword.strengthNumber",
    test: (value: string) => /\d/.test(value),
  },
  {
    key: "special",
    labelKey: "changePassword.strengthSpecial",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

type Strength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): { strength: Strength; score: number } {
  const score = PASSWORD_REQUIREMENTS.filter((item) => item.test(password)).length;
  if (score <= 1) {
    return { strength: "weak", score };
  }
  if (score <= 3) {
    return { strength: "medium", score };
  }
  return { strength: "strong", score };
}

const STRENGTH_STYLES: Record<Strength, { track: string; fill: string; label: string }> = {
  weak: {
    track: "bg-slate-200 dark:bg-slate-800",
    fill: "bg-rose-500",
    label: "changePassword.strengthWeak",
  },
  medium: {
    track: "bg-slate-200 dark:bg-slate-800",
    fill: "bg-amber-500",
    label: "changePassword.strengthMedium",
  },
  strong: {
    track: "bg-slate-200 dark:bg-slate-800",
    fill: "bg-emerald-500",
    label: "changePassword.strengthStrong",
  },
};

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const strengthStyle = STRENGTH_STYLES[passwordStrength.strength];

  const currentPasswordInvalid = currentPassword.length > 0 && currentPassword.trim().length === 0;
  const newPasswordInvalid =
    newPassword.length > 0 &&
    (newPassword.trim().length === 0 || newPassword.length < 8 || newPassword === currentPassword);
  const confirmPasswordInvalid = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const hasLocalError = currentPasswordInvalid || newPasswordInvalid || confirmPasswordInvalid;
  const formError =
    serverError ||
    (confirmPassword.length > 0 && newPassword !== confirmPassword
      ? t("changePassword.confirmPasswordDoesNotMatch")
      : "");

  useEffect(() => {
    setServerError("");
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();

    if (!trimmedCurrent) {
      setServerError(t("changePassword.currentPasswordIsRequired"));
      return;
    }
    if (!trimmedNew) {
      setServerError(t("changePassword.newPasswordIsRequired"));
      return;
    }
    if (trimmedNew.length < 8) {
      setServerError(t("changePassword.newPasswordMinLength"));
      return;
    }
    if (trimmedNew === currentPassword) {
      setServerError(t("changePassword.newPasswordMustBeDifferent"));
      return;
    }
    if (trimmedNew !== confirmPassword) {
      setServerError(t("changePassword.confirmPasswordDoesNotMatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await userManager.updatePassword(currentPassword, newPassword);
      if (result.success) {
        toast.success(t("changePassword.passwordUpdatedSuccessfully"));
        navigate("/user/account");
      } else {
        const message = result.error || t("changePassword.unableToUpdatePassword");
        setServerError(message);
        toast.error(message);
      }
    } catch {
      const message = t("changePassword.unableToUpdatePassword");
      setServerError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPasswordToggle = (onClick: () => void, ariaLabel: string, visible: boolean) => (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800">
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/user/account")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 focus-visible:outline-none dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-balance text-slate-900 dark:text-white">
              {t("changePassword.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("changePassword.subtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
          <div className="space-y-2">
            <Label
              htmlFor={currentPasswordId}
              className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {t("changePassword.currentPassword")}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={currentPasswordId}
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder={t("changePassword.currentPasswordPlaceholder")}
                aria-invalid={currentPasswordInvalid || undefined}
                aria-describedby={currentPasswordInvalid ? `${errorId}-current` : undefined}
                className={INPUT_CLASSES}
              />
              {renderPasswordToggle(
                () => setShowCurrentPassword((prev) => !prev),
                showCurrentPassword
                  ? t("changePassword.hideCurrentPassword")
                  : t("changePassword.showCurrentPassword"),
                showCurrentPassword
              )}
            </div>
            {currentPasswordInvalid && (
              <p id={`${errorId}-current`} className="text-xs text-rose-600 dark:text-rose-400">
                {t("changePassword.currentPasswordIsRequired")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={newPasswordId}
              className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {t("changePassword.newPassword")}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={newPasswordId}
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={t("changePassword.newPasswordPlaceholder")}
                aria-invalid={newPasswordInvalid || undefined}
                aria-describedby={
                  newPasswordInvalid || confirmPasswordInvalid ? errorId : undefined
                }
                className={INPUT_CLASSES}
              />
              {renderPasswordToggle(
                () => setShowNewPassword((prev) => !prev),
                showNewPassword
                  ? t("changePassword.hideNewPassword")
                  : t("changePassword.showNewPassword"),
                showNewPassword
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("changePassword.newPasswordHint")}
                </p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t(strengthStyle.label)}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${strengthStyle.fill}`}
                  style={{
                    width: `${(passwordStrength.score / PASSWORD_REQUIREMENTS.length) * 100}%`,
                  }}
                />
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {PASSWORD_REQUIREMENTS.map((item) => (
                  <li
                    key={item.key}
                    className={`flex items-center gap-2 text-xs ${
                      item.test(newPassword)
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}>
                    <span
                      className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                        item.test(newPassword) ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    />
                    {t(item.labelKey)}
                  </li>
                ))}
              </ul>
            </div>
            {newPasswordInvalid && (
              <div id={errorId} className="space-y-1">
                {newPassword === currentPassword ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {t("changePassword.newPasswordMustBeDifferent")}
                  </p>
                ) : (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {t("changePassword.newPasswordMinLength")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={confirmPasswordId}
              className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {t("changePassword.confirmPassword")}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={confirmPasswordId}
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("changePassword.confirmPasswordPlaceholder")}
                aria-invalid={confirmPasswordInvalid || undefined}
                aria-describedby={confirmPasswordInvalid ? `${errorId}-confirm` : undefined}
                className={INPUT_CLASSES}
              />
              {renderPasswordToggle(
                () => setShowConfirmPassword((prev) => !prev),
                showConfirmPassword
                  ? t("changePassword.hideConfirmPassword")
                  : t("changePassword.showConfirmPassword"),
                showConfirmPassword
              )}
            </div>
            {confirmPasswordInvalid && (
              <p id={`${errorId}-confirm`} className="text-xs text-rose-600 dark:text-rose-400">
                {t("changePassword.confirmPasswordDoesNotMatch")}
              </p>
            )}
          </div>

          {formError ? (
            <p
              id={errorId}
              className="text-sm text-rose-600 dark:text-rose-400"
              role="status"
              aria-live="polite">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || hasLocalError}
            className="flex w-full items-center justify-center rounded-lg bg-[#0047AB] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#003b8f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#0047AB] dark:text-white">
            {isSubmitting ? <SpinnerBlock size="sm" /> : t("changePassword.saveChanges")}
          </button>
        </form>
      </Card>
    </div>
  );
}
