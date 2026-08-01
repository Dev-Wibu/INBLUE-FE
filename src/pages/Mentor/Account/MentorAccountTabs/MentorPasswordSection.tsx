import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import { mentorManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { ChevronRight, Lock } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const INPUT_CLASSES =
  "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

export function MentorPasswordSection() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const authUser = useAuthStore((state) => state.user);
  const errorId = useId();

  const handleClose = () => {
    setIsOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setServerError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

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
    if (trimmedCurrent === trimmedNew) {
      setServerError(t("changePassword.newPasswordMustBeDifferent"));
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setServerError(t("changePassword.confirmPasswordDoesNotMatch"));
      return;
    }
    if (!authUser?.id) {
      setServerError("User ID not found");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await mentorManager.changePassword(authUser.id, trimmedCurrent, trimmedNew);
      if (result.success) {
        toast.success(t("changePassword.passwordUpdatedSuccessfully"));
        handleClose();
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800">
      {visible ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" x2="23" y1="1" y2="23" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-['Inter'] text-lg font-semibold text-zinc-800 dark:text-white">
                {t("common.changePassword")}
              </h3>
              <p className="font-['Inter'] text-sm font-normal text-gray-500 dark:text-slate-400">
                {t("common.changeYourPasswordToSecureYourAcco")}
              </p>
            </div>
          </div>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 font-['Inter'] text-base font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              {t("common.change")}
              <ChevronRight className="h-5 w-5" />
            </button>
          </DialogTrigger>
        </div>
      </Card>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("changePassword.title")}</DialogTitle>
          <DialogDescription>{t("changePassword.subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label
              htmlFor={`${errorId}-current`}
              className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {t("changePassword.currentPassword")}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={`${errorId}-current`}
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("changePassword.currentPasswordPlaceholder")}
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
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`${errorId}-new`}
              className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {t("changePassword.newPassword")}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={`${errorId}-new`}
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("changePassword.newPasswordPlaceholder")}
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
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`${errorId}-confirm`}
              className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {t("changePassword.confirmPassword")}
            </Label>
            <div className="flex items-center gap-1">
              <Input
                id={`${errorId}-confirm`}
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("changePassword.confirmPasswordPlaceholder")}
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
          </div>

          {serverError ? (
            <p id={errorId} className="text-sm text-rose-600 dark:text-rose-400" role="status">
              {serverError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700">
              {isSubmitting ? <SpinnerBlock size="sm" /> : t("changePassword.saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
