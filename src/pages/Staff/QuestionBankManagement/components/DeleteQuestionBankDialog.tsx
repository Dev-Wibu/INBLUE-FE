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
import { AlertTriangle, EyeOff } from "lucide-react";
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

  // This dialog previously asked the user to confirm a hard "delete" - but on the
  // backend DELETE /api/question-banks/{id} is in fact a soft-delete (it just flips
  // isDeleted=true, and the question can be re-activated later). Renaming the action
  // to "Inactive" so the wording matches what will actually happen and removes the
  // scary "không thể hoàn tác" copy that contradicts the re-activate flow.
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-amber-500" />
            {t("adminQuestionbankmanagement.inactiveConfirmTitle", "Inactive câu hỏi?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "adminQuestionbankmanagement.inactiveConfirmDescription",
              "Câu hỏi này sẽ bị ẩn khỏi các bộ đề / quiz. Bạn có thể kích hoạt lại bất cứ lúc nào."
            )}
            <br />
            <br />
            <strong>{t("general.contentWithColon")}</strong>{" "}
            {question?.questionText?.substring(0, 50)}...
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("general.cancel", "Huỷ")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600">
            <AlertTriangle className="mr-2 h-3.5 w-3.5" />
            {t("adminQuestionbankmanagement.inactiveAction", "Inactive")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
