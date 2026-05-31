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
import { useTranslation } from "react-i18next";

import type { JobDescription } from "../types";

interface JobDescriptionDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobDescription: JobDescription | null;
  onConfirm: () => void;
}

export function JobDescriptionDeleteDialog({
  isOpen,
  onOpenChange,
  jobDescription,
  onConfirm,
}: JobDescriptionDeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("adminCompanymanagement.closeJd")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("adminCompanymanagement.areYouSureYouWant")}
            {jobDescription?.title}
            {t("adminCompanymanagement.jdWillSwitchToStatus")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("general.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
            {t("adminCompanymanagement.closeJd")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
