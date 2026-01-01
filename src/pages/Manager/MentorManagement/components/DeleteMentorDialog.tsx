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
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Mentor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete mentor &quot;{mentor?.name}&quot;? This action cannot be
            undone and will deactivate the mentor account.
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
