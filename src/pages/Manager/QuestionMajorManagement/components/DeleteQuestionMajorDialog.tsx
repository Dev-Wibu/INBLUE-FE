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
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Question Major</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete major &quot;{major?.majorName}&quot;? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
