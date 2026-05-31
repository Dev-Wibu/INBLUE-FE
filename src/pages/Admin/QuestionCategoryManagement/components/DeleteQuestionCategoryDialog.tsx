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
import type { QuestionCategory } from "../types";
interface DeleteQuestionCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: QuestionCategory | null;
  onConfirm: () => void;
}
export function DeleteQuestionCategoryDialog({
  isOpen,
  onOpenChange,
  category,
  onConfirm,
}: DeleteQuestionCategoryDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("adminQuestioncategorymanagement.deleteQuestionList")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("adminQuestioncategorymanagement.areYouSureYouWant")}
            {category?.categoryName}
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
