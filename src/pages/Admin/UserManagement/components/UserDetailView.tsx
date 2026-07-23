import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CVUploadModal from "@/components/ui/cv-upload-modal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { CandidateProfile } from "@/interfaces/schema.types";
import { formatDate } from "@/lib/formatting";
import { queryClient } from "@/lib/queryClient";
import { usersAdminManager } from "@/services/users-admin.manager";
import {
  Award,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Code,
  Edit,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Mail,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { User as UserType } from "../types";
import { AdminCandidateProfileEditForm } from "./AdminCandidateProfileEditForm";
import { UserEditForm, type ExtendedUserFormData } from "./UserEditForm";

interface UserDetailViewProps {
  user: UserType;
  profile: CandidateProfile | null;
  onBack: () => void;
  formData: ExtendedUserFormData;
  onFormChange: (data: ExtendedUserFormData) => void;
  onSubmit: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CollapsibleCard({ title, icon: Icon, children, defaultOpen = true, id }: any) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all dark:border-slate-800/60 dark:bg-slate-900/40">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-slate-500" />}
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      {isOpen && <div className="mt-6">{children}</div>}
    </div>
  );
}

export function UserDetailView({
  user,
  profile,
  onBack,
  formData,
  onFormChange,
  onSubmit,
}: UserDetailViewProps) {
  const { t } = useTranslation();
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);
  const [isCvUploading, setIsCvUploading] = useState(false);

  const handleCvUpload = async (file: File) => {
    try {
      setIsCvUploading(true);
      const response = await usersAdminManager.uploadCv(user.id!, file);
      if (response.data) {
        toast.success("Tải lên CV thành công");
        await queryClient.invalidateQueries({
          queryKey: ["get", "/api/candidate-profiles/{userId}"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["get", "/api/users"],
        });
        setIsCvModalOpen(false);
      } else {
        toast.error(response.error || "Tải lên CV thất bại");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Tải lên CV thất bại");
    } finally {
      setIsCvUploading(false);
    }
  };

  const handleSaveUser = () => {
    onSubmit();
    setIsEditingUser(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollToSection = (e: any, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="w-full">
          {isEditingUser ? (
            <div className="mx-auto max-w-4xl">
              <UserEditForm
                formData={formData}
                onFormChange={onFormChange}
                onSubmit={handleSaveUser}
                onCancel={() => setIsEditingUser(false)}
                title={t("adminUsermanagement.userEditing")}
                description={t("adminUsermanagement.updateUserInformation")}
                submitLabel={t("common.saveChanges")}
                selectedUser={user}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
              {/* Left Column: Sticky Profile Card */}
              <div className="lg:sticky lg:top-0 lg:col-span-3">
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="relative h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-500/10 dark:to-purple-500/10" />
                  <div className="relative px-6 pb-6 text-center">
                    <div className="-mt-12 mb-4 inline-flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-10 w-10 text-slate-400" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {user.name}
                    </h3>
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{user.email}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Badge
                        variant="outline"
                        className="px-3 py-1 text-xs font-medium tracking-wider uppercase">
                        {user.role}
                      </Badge>
                      {profile?.targetLevel && (
                        <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
                          {profile.targetLevel}
                        </Badge>
                      )}
                    </div>

                    {profile?.createdAt && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                          Join Date
                        </p>
                        <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                          {formatDate(profile.createdAt)}
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex flex-col gap-2">
                      {user?.cvUrl && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="secondary"
                              className="w-full bg-blue-50 text-blue-700 shadow-sm hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40">
                              <FileText className="mr-2 h-4 w-4" />
                              Xem CV
                              <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] w-[90vw] max-w-5xl overflow-hidden p-0">
                            <div className="h-[85vh] w-full bg-slate-100 dark:bg-slate-900">
                              <iframe
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(user.cvUrl)}&embedded=true`}
                                className="h-full w-full border-0"
                                title="CV Viewer"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Button
                        variant="outline"
                        className="w-full shadow-sm"
                        onClick={() => setIsCvModalOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" />
                        {user?.cvUrl ? "Cập nhật CV" : "Tải lên CV"}
                      </Button>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        className="flex-1 shadow-none"
                        variant="default"
                        onClick={() => setIsEditingUser(true)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Tài khoản
                      </Button>
                      <Button
                        className="flex-1 shadow-none"
                        variant="outline"
                        onClick={() => setIsEditingProfile(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Hồ sơ
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column: Detailed Info or Profile Edit Form */}
              <div className="lg:col-span-7">
                {isEditingProfile ? (
                  <AdminCandidateProfileEditForm
                    userId={user.id!}
                    onCancel={() => setIsEditingProfile(false)}
                  />
                ) : (
                  <div className="space-y-6">
                    {profile ? (
                      <>
                        {profile.introduction && (
                          <CollapsibleCard id="intro" title={t("common.introduce")} icon={UserIcon}>
                            <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                              {profile.introduction}
                            </p>
                          </CollapsibleCard>
                        )}

                        {/* Skills & Tools */}
                        <CollapsibleCard
                          id="skills"
                          title={t("common.technicalSkills")}
                          icon={Code}>
                          <div className="space-y-6">
                            {/* Technical Skills */}
                            <section>
                              <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {t("common.technicalSkills")}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(profile.technicalSkills ?? []).length > 0 ? (
                                  profile.technicalSkills!.map((s) => (
                                    <Badge
                                      key={s}
                                      className="border-none bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20">
                                      {s}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    {t("adminUsermanagement.noInformationYet")}
                                  </span>
                                )}
                              </div>
                            </section>

                            {/* Soft Skills */}
                            <section>
                              <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {t("common.softSkills")}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(profile.softSkills ?? []).length > 0 ? (
                                  profile.softSkills!.map((s) => (
                                    <Badge
                                      key={s}
                                      className="border-none bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20">
                                      {s}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    {t("adminUsermanagement.noInformationYet")}
                                  </span>
                                )}
                              </div>
                            </section>

                            {/* Tools */}
                            <section>
                              <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {t("common.tools")}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(profile.tools ?? []).length > 0 ? (
                                  profile.tools!.map((t_) => (
                                    <Badge
                                      key={t_}
                                      className="border-none bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20">
                                      {t_}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    {t("adminUsermanagement.noInformationYet")}
                                  </span>
                                )}
                              </div>
                            </section>
                          </div>
                        </CollapsibleCard>

                        {/* Work Experience */}
                        <CollapsibleCard
                          id="experience"
                          title={t("common.workExperience")}
                          icon={Briefcase}>
                          {(profile.workExperiences ?? []).length > 0 ? (
                            <div className="relative border-l-2 border-slate-100 pl-6 dark:border-slate-800">
                              <div className="space-y-8">
                                {profile.workExperiences!.map((w, i) => (
                                  <div key={i} className="relative">
                                    <div className="absolute top-1 -left-[35px] h-4 w-4 rounded-full border-4 border-white bg-indigo-500 dark:border-slate-900" />
                                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                                        {w.position}
                                      </h4>
                                      <span className="mt-1 text-sm font-medium text-slate-500 sm:mt-0 dark:text-slate-400">
                                        {w.start_date} — {w.end_date || t("common.present")}
                                      </span>
                                    </div>
                                    <p className="mt-1 font-medium text-indigo-600 dark:text-indigo-400">
                                      {w.company}
                                    </p>
                                    {w.description && (
                                      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                        {w.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">
                              {t("adminUsermanagement.noInformationYet")}
                            </p>
                          )}
                        </CollapsibleCard>

                        {/* Projects */}
                        <CollapsibleCard
                          id="projects"
                          title={t("common.project")}
                          icon={FolderOpen}>
                          {(profile.projects ?? []).length > 0 ? (
                            <div className="relative border-l-2 border-slate-100 pl-6 dark:border-slate-800">
                              <div className="space-y-8">
                                {profile.projects!.map((p, i) => (
                                  <div key={i} className="relative">
                                    <div className="absolute top-1 -left-[35px] h-4 w-4 rounded-full border-4 border-white bg-teal-500 dark:border-slate-900" />
                                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                                      {p.name}
                                    </h4>
                                    {p.description && (
                                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                        {p.description}
                                      </p>
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {p.role && (
                                        <Badge variant="outline" className="text-xs">
                                          {t("general.role")}: {p.role}
                                        </Badge>
                                      )}
                                      {p.teamSize && (
                                        <Badge variant="outline" className="text-xs">
                                          {t("common.team")}: {p.teamSize} {t("common.people")}
                                        </Badge>
                                      )}
                                    </div>
                                    {p.usedTools && p.usedTools.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {p.usedTools.map((t_) => (
                                          <span
                                            key={t_}
                                            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            {t_}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">
                              {t("adminUsermanagement.noInformationYet")}
                            </p>
                          )}
                        </CollapsibleCard>

                        {/* Education */}
                        <CollapsibleCard
                          id="education"
                          title={t("common.education")}
                          icon={GraduationCap}>
                          {(profile.educations ?? []).length > 0 ? (
                            <div className="relative border-l-2 border-slate-100 pl-6 dark:border-slate-800">
                              <div className="space-y-8">
                                {profile.educations!.map((e, i) => (
                                  <div key={i} className="relative">
                                    <div className="absolute top-1 -left-[35px] h-4 w-4 rounded-full border-4 border-white bg-rose-500 dark:border-slate-900" />
                                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                                        {e.school}
                                      </h4>
                                      <span className="mt-1 text-sm font-medium text-slate-500 sm:mt-0 dark:text-slate-400">
                                        {e.start_date} — {e.end_date || t("common.present")}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                      {e.major} — {e.degree}
                                    </p>
                                    {e.gpa && (
                                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                        {t("common.gpa")}:{" "}
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                          {e.gpa}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400">
                              {t("adminUsermanagement.noInformationYet")}
                            </p>
                          )}
                        </CollapsibleCard>

                        {/* Certifications */}
                        <CollapsibleCard
                          id="certifications"
                          title="Chứng chỉ (Certifications)"
                          icon={Award}>
                          {(profile.certifications ?? []).length > 0 ? (
                            <ul className="space-y-3">
                              {profile.certifications!.map((cert, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                  <span className="text-slate-700 dark:text-slate-300">{cert}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-400">
                              {t("adminUsermanagement.noInformationYet")}
                            </p>
                          )}
                        </CollapsibleCard>

                        {/* Achievements */}
                        <CollapsibleCard
                          id="achievements"
                          title="Thành tựu (Achievements)"
                          icon={Trophy}>
                          {(profile.achievements ?? []).length > 0 ? (
                            <ul className="space-y-3">
                              {profile.achievements!.map((ach, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                                  <span className="text-slate-700 dark:text-slate-300">{ach}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-slate-400">
                              {t("adminUsermanagement.noInformationYet")}
                            </p>
                          )}
                        </CollapsibleCard>
                      </>
                    ) : (
                      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/40">
                        <p className="text-slate-500 dark:text-slate-400">
                          {t("adminUsermanagement.noInformationYet")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: TOC Menu (Only visible when not editing profile) */}
              {!isEditingProfile && (
                <div className="hidden lg:sticky lg:top-0 lg:col-span-2 lg:block">
                  <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <h4 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      Nội dung
                    </h4>
                    <nav className="space-y-1">
                      {profile?.introduction && (
                        <a
                          href="#intro"
                          onClick={(e) => scrollToSection(e, "intro")}
                          className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                          {t("common.introduce")}
                        </a>
                      )}
                      <a
                        href="#skills"
                        onClick={(e) => scrollToSection(e, "skills")}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                        {t("common.technicalSkills")}
                      </a>
                      <a
                        href="#experience"
                        onClick={(e) => scrollToSection(e, "experience")}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                        {t("common.workExperience")}
                      </a>
                      <a
                        href="#projects"
                        onClick={(e) => scrollToSection(e, "projects")}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                        {t("common.project")}
                      </a>
                      <a
                        href="#education"
                        onClick={(e) => scrollToSection(e, "education")}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                        {t("common.education")}
                      </a>
                      <a
                        href="#certifications"
                        onClick={(e) => scrollToSection(e, "certifications")}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                        Chứng chỉ
                      </a>
                      <a
                        href="#achievements"
                        onClick={(e) => scrollToSection(e, "achievements")}
                        className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400">
                        Thành tựu
                      </a>
                    </nav>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <CVUploadModal
          isOpen={isCvModalOpen}
          onOpenChange={setIsCvModalOpen}
          currentCvUrl={user?.cvUrl}
          onUpload={handleCvUpload}
          isUploading={isCvUploading}
          title="Cập nhật CV"
          description="Tải lên CV (định dạng PDF) cho ứng viên này."
        />
      </div>
    );
}
