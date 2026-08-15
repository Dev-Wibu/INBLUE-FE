import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TemplateDeleteDialogProps {
  open: boolean;
  templateName?: string;
  isDeleting: boolean;
  onOpenChange: (_open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function TemplateDeleteDialog({
  open,
  templateName,
  isDeleting,
  onOpenChange,
  onConfirm,
}: TemplateDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isDeleting && onOpenChange(nextOpen)}>
      <AlertDialogContent className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <AlertDialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
            <Trash2 className="h-5 w-5" />
          </div>
          <AlertDialogTitle className="text-slate-950 dark:text-white">
            {t("adminCompanymanagement.deleteTemplateTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-6 text-slate-600 dark:text-slate-400">
            {t("adminCompanymanagement.confirmDeleteTemplateNamed", {
              name: templateName || t("adminAdmindashboard.processTemplate"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500">
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isDeleting ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
