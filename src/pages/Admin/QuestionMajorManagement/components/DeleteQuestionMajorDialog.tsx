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
import type { Major } from "../types";
interface DeleteQuestionMajorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  major: Major | null;
  onConfirm: () => void;
}
export function DeleteQuestionMajorDialog({
  isOpen,
  onOpenChange,
  major,
  onConfirm,
}: DeleteQuestionMajorDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("adminQuestionmajormanagement.deleteMajor")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("adminQuestionmajormanagement.areYouSureYouWant")}
            {major?.majorName}
            {t("common.quotThisActionCannotBeUndone1")}
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
