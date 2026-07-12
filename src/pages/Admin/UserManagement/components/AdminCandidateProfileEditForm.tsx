import { Button } from "@/components/ui/button";
import { BasicInfoSection } from "@/pages/User/Account/CandidateProfile/BasicInfoSection";
import { ExperienceSection } from "@/pages/User/Account/CandidateProfile/ExperienceSection";
import { SkillsSection } from "@/pages/User/Account/CandidateProfile/SkillsSection";
import { useCandidateProfileForm } from "@/pages/User/Account/CandidateProfile/useCandidateProfileForm";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export function AdminCandidateProfileEditForm({
  userId,
  onCancel,
}: {
  userId: number;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const form = useCandidateProfileForm(userId);

  // Initialize editing mode automatically when mounted
  useEffect(() => {
    if (form.hasProfile && !form.isEditing && !form.isLoading) {
      form.startEditing();
    } else if (!form.hasProfile && !form.isEditing && !form.isLoading) {
      form.startEditing();
    }
  }, [form.hasProfile, form.isEditing, form.isLoading, form.startEditing]);

  if (form.isLoading || !form.isEditing) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const handleSave = async () => {
    await form.handleSave();
    onCancel();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {form.hasProfile
                ? "Chỉnh sửa Hồ sơ Ứng viên"
                : "Tạo mới Hồ sơ Ứng viên"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cập nhật các thông tin chi tiết về kỹ năng, dự án, học vấn...
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              {t("general.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={form.createMutation.isPending || form.updateMutation.isPending}>
              {form.createMutation.isPending || form.updateMutation.isPending
                ? t("common.saving")
                : t("common.saveChanges")}
            </Button>
          </div>
        </div>
      </div>

      <BasicInfoSection mode="edit" formData={form.formData} setFormData={form.setFormData} />

      <SkillsSection
        mode="edit"
        activeSkillTab={form.activeSkillTab}
        setActiveSkillTab={form.setActiveSkillTab}
        newSkillValue={form.newSkillValue}
        setNewSkillValue={form.setNewSkillValue}
        techSkillsInput={form.techSkillsInput}
        softSkillsInput={form.softSkillsInput}
        toolsInput={form.toolsInput}
        certificationsInput={form.certificationsInput}
        achievementsInput={form.achievementsInput}
        getSkillList={form.getSkillList}
        addSkillBadge={form.addSkillBadge}
        removeSkillBadge={form.removeSkillBadge}
        addListItem={form.addListItem}
        updateListItem={form.updateListItem}
        removeListItem={form.removeListItem}
      />

      <ExperienceSection
        mode="edit"
        formData={form.formData}
        addProject={form.addProject}
        updateProject={form.updateProject}
        removeProject={form.removeProject}
        addWorkExperience={form.addWorkExperience}
        updateWorkExperience={form.updateWorkExperience}
        removeWorkExperience={form.removeWorkExperience}
        addEducation={form.addEducation}
        updateEducation={form.updateEducation}
        removeEducation={form.removeEducation}
      />
    </div>
  );
}
