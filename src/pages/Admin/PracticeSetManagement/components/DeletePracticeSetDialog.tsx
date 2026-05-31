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

import type { PracticeSet } from "../types";

interface DeletePracticeSetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  practiceSet: PracticeSet | null;
  onConfirm: () => void;
}

export function DeletePracticeSetDialog({
  isOpen,
  onOpenChange,
  practiceSet,
  onConfirm,
}: DeletePracticeSetDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("adminPracticesetmanagement.deleteQuestionSet")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("adminPracticesetmanagement.areYouSureYouWant")}
            {practiceSet?.practiceSetName}
            {t("adminPracticesetmanagement.quotOnionThisActionCannot")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("general.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
            {t("general.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
