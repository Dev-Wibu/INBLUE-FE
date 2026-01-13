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

import type { QuestionSet } from "../types";

interface DeleteQuestionSetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  questionSet: QuestionSet | null;
  onConfirm: () => void;
}

export function DeleteQuestionSetDialog({
  isOpen,
  onOpenChange,
  questionSet,
  onConfirm,
}: DeleteQuestionSetDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Question Set</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete question set &quot;{questionSet?.questionSetName}&quot;?
            This action cannot be undone.
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
