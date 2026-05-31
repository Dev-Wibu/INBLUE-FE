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
import type { User } from "../types";
interface DeleteUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void;
}
export function DeleteUserDialog({ isOpen, onOpenChange, user, onConfirm }: DeleteUserDialogProps) {
  const { t } = useTranslation();
  const isCurrentlyActive = user?.isActive !== false;
  const actionTitle = isCurrentlyActive ? t("common.disable") : t("common.activate");
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {actionTitle} {t("adminUsermanagement.user")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCurrentlyActive
              ? t("general.areYouSureYouWant7", {
                  var_0: user?.name,
                })
              : t("general.areYouSureYouWant8", {
                  var_0: user?.name,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("general.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              isCurrentlyActive
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                : "bg-green-600 hover:bg-green-700 focus:ring-green-600"
            }>
            {actionTitle}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
