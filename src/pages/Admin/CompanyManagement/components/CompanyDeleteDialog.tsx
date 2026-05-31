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
import type { Company } from "../types";
interface CompanyDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onConfirm: () => void;
}
const isCompanyActive = (company?: Company | null) =>
  (company?.status ?? "ACTIVE").toUpperCase() !== "INACTIVE";
export function CompanyDeleteDialog({
  isOpen,
  onOpenChange,
  company,
  onConfirm,
}: CompanyDeleteDialogProps) {
  const { t } = useTranslation();
  const active = isCompanyActive(company);
  const actionTitle = active ? t("common.disable") : t("common.activate");
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {actionTitle} {t("adminCompanymanagement.company")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {active
              ? t("general.areYouSureYouWant3", {
                  var_0: company?.name,
                })
              : t("general.areYouSureYouWant4", {
                  var_0: company?.name,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("general.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              active
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
