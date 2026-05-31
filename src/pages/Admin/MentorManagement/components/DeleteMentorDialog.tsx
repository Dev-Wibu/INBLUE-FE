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

import type { Mentor } from "../types";

interface DeleteMentorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mentor: Mentor | null;
  onConfirm: () => void;
}

export function DeleteMentorDialog({
  isOpen,
  onOpenChange,
  mentor,
  onConfirm,
}: DeleteMentorDialogProps) {
  const { t } = useTranslation();
  const isActive = mentor?.active !== false;
  const action = isActive
    ? t("adminMentormanagement.disable")
    : t("adminMentormanagement.activate");
  const actionTitle = isActive
    ? t("adminMentormanagement.disableMentor")
    : t("adminMentormanagement.activateMentor");
  const actionDescription = isActive
    ? t("general.areYouSureYouWant5", { var_0: mentor?.name })
    : t("general.areYouSureYouWant6", { var_0: mentor?.name });

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionTitle}</AlertDialogTitle>
          <AlertDialogDescription>{actionDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("general.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              isActive
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                : "bg-green-600 hover:bg-green-700 focus:ring-green-600"
            }>
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
