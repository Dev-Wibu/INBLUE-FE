import { Button } from "@/components/ui/button";
import { codingProblemManager, type CodingProblem } from "@/services/coding-problem.manager";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CodingProblemGrid } from "./components/CodingProblemGrid";
import { CodingProblemEditor } from "./components/editor/CodingProblemEditor";

export function CodingProblemManagementPage() {
  const { t } = useTranslation();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editor State
  const [isAuthoring, setIsAuthoring] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Partial<CodingProblem> | null>(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    setIsLoading(true);
    try {
      const res = await codingProblemManager.getAll();
      if (res.success && res.data) {
        setProblems(res.data);
      } else {
        toast.error(res.error || t("problem.loadCodingListFailed"));
      }
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProblem(null);
    setIsAuthoring(true);
  };

  const handleEdit = (problem: CodingProblem) => {
    setEditingProblem(problem);
    setIsAuthoring(true);
  };

  const handleEditorBack = () => {
    setIsAuthoring(false);
    setEditingProblem(null);
  };

  const handleEditorSaved = () => {
    setIsAuthoring(false);
    setEditingProblem(null);
    fetchProblems();
  };

  if (isAuthoring) {
    return (
      <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-slate-950">
        <CodingProblemEditor
          initialData={editingProblem}
          onBack={handleEditorBack}
          onSaved={handleEditorSaved}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col relative">
      <div className="border-b bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quản lý Bài thi Coding
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Quản lý danh sách các bài tập thuật toán (Coding Problems) dùng trong vòng đánh giá năng lực lập trình.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreate}
              className="bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("adminCodeReviewProblem.addProblem", "Thêm Bài Tập")}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 h-full flex flex-col flex-1">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-sm text-slate-500">Đang tải danh sách bài tập...</p>
          </div>
        ) : (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CodingProblemGrid problems={problems} onEdit={handleEdit} />
          </div>
        )}
      </div>
    </div>
  );
}
