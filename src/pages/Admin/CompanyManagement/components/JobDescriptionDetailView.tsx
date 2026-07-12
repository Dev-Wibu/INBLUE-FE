import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Code, FileText, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { JobDescription } from "../types";

interface JobDescriptionDetailViewProps {
  jobDescription: JobDescription;
  onBack: () => void;
  onEdit: (job: JobDescription) => void;
}

export function JobDescriptionDetailView({
  jobDescription,
  onBack,
  onEdit,
}: JobDescriptionDetailViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-border/50 sticky top-0 z-10 border-b bg-white/80 px-6 py-4 backdrop-blur-xl dark:bg-slate-900/80">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {jobDescription.title}
              </h2>
              <Badge variant={jobDescription.status === "OPEN" ? "default" : "secondary"}>
                {jobDescription.status}
              </Badge>
              <Badge variant="outline">{jobDescription.level}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onEdit(jobDescription)}>
            {t("general.edit")}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Job Info */}
        <div className="border-border/50 w-2/3 overflow-y-auto border-r p-6">
          <div className="mx-auto max-w-3xl space-y-8">
            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                {t("common.description", "Mô tả công việc")}
              </h3>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                {jobDescription.description || (
                  <span className="text-slate-400 italic">Chưa có thông tin</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                {t("common.requirements", "Yêu cầu")}
              </h3>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                {jobDescription.requirements || (
                  <span className="text-slate-400 italic">Chưa có thông tin</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wider text-slate-500 uppercase">
                {t("common.benefits", "Quyền lợi")}
              </h3>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                {jobDescription.benefits || (
                  <span className="text-slate-400 italic">Chưa có thông tin</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Rounds Timeline */}
        <div className="w-1/3 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("common.interviewProcess", "Quy trình phỏng vấn")}
            </h3>
          </div>

          <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent md:before:mx-auto md:before:translate-x-0">
            {/* Round Items will go here - hardcoded for now until we parse rounds properly */}
            <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-slate-200 text-slate-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:border-slate-900 dark:bg-slate-800">
                <FileText className="h-4 w-4" />
              </div>
              <div className="w-[calc(100%-4rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:w-[calc(50%-2.5rem)] dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1 flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-slate-100">Duyệt CV</div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">HR screening</div>
              </div>
            </div>

            <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-blue-100 text-blue-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:border-slate-900 dark:bg-blue-900/50">
                <Code className="h-4 w-4" />
              </div>
              <div className="w-[calc(100%-4rem)] cursor-pointer rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm transition-colors hover:border-blue-300 md:w-[calc(50%-2.5rem)] dark:border-blue-900/50 dark:bg-blue-900/20">
                <div className="mb-1 flex items-center justify-between">
                  <div className="font-bold text-blue-900 dark:text-blue-100">
                    Phỏng vấn Kỹ thuật
                  </div>
                </div>
                <div className="text-sm text-blue-700/80 dark:text-blue-300/80">
                  2 Bài tập thuật toán (45 phút)
                </div>
              </div>
            </div>

            <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-slate-200 text-slate-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:border-slate-900 dark:bg-slate-800">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="w-[calc(100%-4rem)] cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 md:w-[calc(50%-2.5rem)] dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1 flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Phỏng vấn Mentor
                  </div>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Phỏng vấn 1:1</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button variant="outline" className="w-full border-dashed">
              + Thêm vòng phỏng vấn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
