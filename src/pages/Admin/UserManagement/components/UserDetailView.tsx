import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { CandidateProfile } from "@/interfaces/schema.types";
import {
  BookOpen,
  Briefcase,
  ChevronLeft,
  Code,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Mail,
  User as UserIcon,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { User as UserType } from "../types";
import { UserEditForm, type ExtendedUserFormData } from "./UserEditForm";

interface UserDetailViewProps {
  user: UserType;
  profile: CandidateProfile | null;
  onBack: () => void;
  formData: ExtendedUserFormData;
  onFormChange: (data: ExtendedUserFormData) => void;
  onSubmit: () => void;
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
  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50/50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-none items-center gap-4 border-b border-slate-200/60 bg-white/50 px-6 py-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/50">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t("common.userDetail") || "User Details"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left Column: Sticky Profile Card */}
            <div className="lg:sticky lg:top-0 lg:col-span-4">
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
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</h3>
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

                  {profile?.targetRole && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        {t("common.targetRole")}
                      </p>
                      <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">
                        {profile.targetRole}
                      </p>
                    </div>
                  )}

                  {profile?.introduction && (
                    <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {profile.introduction}
                    </p>
                  )}

                  {profile?.cvUrl && (
                    <a
                      href={profile.cvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40">
                      <FileText className="h-4 w-4" />
                      Xem CV
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  )}

                  <div className="mt-6">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button className="w-full shadow-none" variant="default">
                          <Edit3 className="mr-2 h-4 w-4" />
                          {t("general.edit")} Profile
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
                        <UserEditForm
                          isInline
                          formData={formData}
                          onFormChange={onFormChange}
                          onSubmit={onSubmit}
                          onCancel={() => {}}
                          title={t("adminUsermanagement.userEditing")}
                          description={t("adminUsermanagement.updateUserInformation")}
                          submitLabel={t("common.saveChanges")}
                          selectedUser={user}
                        />
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Info */}
            <div className="space-y-8 lg:col-span-8">
              {profile ? (
                <>
                  {/* Skills & Tools */}
                  <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <div className="space-y-6">
                      {/* Technical Skills */}
                      <section>
                        <div className="mb-4 flex items-center gap-2">
                          <Code className="h-5 w-5 text-blue-500" />
                          <h3 className="text-lg font-semibold tracking-tight">
                            {t("common.technicalSkills")}
                          </h3>
                        </div>
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
                        <div className="mb-4 flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-purple-500" />
                          <h3 className="text-lg font-semibold tracking-tight">
                            {t("common.softSkills")}
                          </h3>
                        </div>
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
                        <div className="mb-4 flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-orange-500" />
                          <h3 className="text-lg font-semibold tracking-tight">
                            {t("common.tools")}
                          </h3>
                        </div>
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
                  </div>

                  {/* Work Experience */}
                  <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <div className="mb-6 flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-semibold tracking-tight">
                        {t("common.workExperience")}
                      </h3>
                    </div>
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
                  </div>

                  {/* Projects */}
                  <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <div className="mb-6 flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-teal-500" />
                      <h3 className="text-lg font-semibold tracking-tight">
                        {t("common.project")}
                      </h3>
                    </div>
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
                  </div>

                  {/* Education */}
                  <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                    <div className="mb-6 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-rose-500" />
                      <h3 className="text-lg font-semibold tracking-tight">
                        {t("common.education")}
                      </h3>
                    </div>
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
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-900/40">
                  <p className="text-slate-500 dark:text-slate-400">
                    {t("adminUsermanagement.noInformationYet")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
