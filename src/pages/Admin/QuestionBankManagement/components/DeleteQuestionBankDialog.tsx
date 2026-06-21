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
import type { QuestionBank } from "../types";

interface DeleteQuestionBankDialogProps {
  isOpen: boolean;
  onOpenChange: (_open: boolean) => void;
  question: QuestionBank | null;
  onConfirm: () => void;
}

export function DeleteQuestionBankDialog({
  isOpen,
  onOpenChange,
  question,
  onConfirm,
}: DeleteQuestionBankDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.delete", "Xóa câu hỏi")}</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa câu hỏi này không? Thao tác này không thể hoàn tác.
            <br />
            <br />
            <strong>Nội dung:</strong> {question?.questionText?.substring(0, 50)}...
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
