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

import type { Session } from "../types";

interface CancelSessionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  onConfirm: () => void;
}

export function CancelSessionDialog({
  isOpen,
  onOpenChange,
  session,
  onConfirm,
}: CancelSessionDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("general.cancelSession")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("adminSessionmanagement.areYouSureYouWant")}
            {session?.roomName || `#${session?.id}`}
            {t("adminSessionmanagement.actionThisCannotBeUndone")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("general.close")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
            {t("adminSessionmanagement.confirmCancellation")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
