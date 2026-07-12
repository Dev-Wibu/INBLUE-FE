import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { CandidateProfile } from "@/interfaces/schema.types";
import { formatDate } from "@/lib/formatting";
import {
  Award,
  BookOpen,
  Briefcase,
  ChevronLeft,
  Code,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Target,
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
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.userDetail") || "User Details"}
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit3 className="mr-2 h-4 w-4" />
                {t("general.edit")}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
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

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {profile ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-6">
                {/* Basic Info Section */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <h3 className="text-base font-semibold">
                      {t("adminUsermanagement.targetInformation")}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-slate-800/50">
                    <div>
                      <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400">
                        {t("common.targetRole")}
                      </span>
                      <p className="mt-1 font-medium">{profile.targetRole || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400">
                        {t("common.level")}
                      </span>
                      <p className="mt-1">
                        {profile.targetLevel ? (
                          <Badge variant="secondary" className="text-sm">
                            {profile.targetLevel}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </div>
                  {profile.introduction && (
                    <div className="mt-3 rounded-lg border p-4 dark:border-slate-700">
                      <span className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400">
                        {t("common.introduce")}
                      </span>
                      <p className="mt-1 text-sm leading-relaxed">{profile.introduction}</p>
                    </div>
                  )}
                  {profile.cvUrl && (
                    <div className="mt-3">
                      <a
                        href={profile.cvUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40">
                        <FileText className="h-4 w-4" />
                        Xem CV
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                    </div>
                  )}
                </section>

                <Separator />

                {/* Technical Skills */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Code className="h-4 w-4 text-green-600" />
                    <h3 className="text-base font-semibold">{t("common.technicalSkills")}</h3>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {(profile.technicalSkills ?? []).length > 0 ? (
                      profile.technicalSkills!.join(", ")
                    ) : (
                      <span className="text-gray-400">
                        {t("adminUsermanagement.noInformationYet")}
                      </span>
                    )}
                  </div>
                </section>

                {/* Soft Skills */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                    <h3 className="text-base font-semibold">{t("common.softSkills")}</h3>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {(profile.softSkills ?? []).length > 0 ? (
                      profile.softSkills!.join(", ")
                    ) : (
                      <span className="text-gray-400">
                        {t("adminUsermanagement.noInformationYet")}
                      </span>
                    )}
                  </div>
                </section>

                {/* Tools */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-orange-500" />
                    <h3 className="text-base font-semibold">{t("common.tools")}</h3>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {(profile.tools ?? []).length > 0 ? (
                      profile.tools!.join(", ")
                    ) : (
                      <span className="text-gray-400">
                        {t("adminUsermanagement.noInformationYet")}
                      </span>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Work Experience */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <h3 className="text-base font-semibold">{t("common.workExperience")}</h3>
                  </div>
                  {(profile.workExperiences ?? []).length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.workExperiences!.map((w, i) => (
                        <div key={i} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{w.position}</p>
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                {w.company}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {w.start_date} — {w.end_date || t("common.present")}
                            </span>
                          </div>
                          {w.description && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                              {w.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {t("adminUsermanagement.noInformationYet")}
                    </span>
                  )}
                </section>

                <Separator />

                {/* Projects */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-teal-600" />
                    <h3 className="text-base font-semibold">{t("common.project")}</h3>
                  </div>
                  {(profile.projects ?? []).length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.projects!.map((p, i) => (
                        <div key={i} className="py-4 first:pt-0 last:pb-0">
                          <p className="font-semibold">{p.name}</p>
                          {p.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                              {p.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
                            {p.role && (
                              <span>
                                {t("general.role")} {p.role}
                              </span>
                            )}
                            {p.teamSize && (
                              <span>
                                {t("common.team")} {p.teamSize} {t("common.people")}
                              </span>
                            )}
                            {p.outcome && (
                              <span>
                                {t("common.result1")} {p.outcome}
                              </span>
                            )}
                          </div>
                          {p.usedTools && p.usedTools.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {p.usedTools.map((t) => (
                                <Badge key={t} variant="outline" className="text-xs">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {t("adminUsermanagement.noInformationYet")}
                    </span>
                  )}
                </section>

                <Separator />

                {/* Education */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-base font-semibold">{t("common.education")}</h3>
                  </div>
                  {(profile.educations ?? []).length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.educations!.map((e, i) => (
                        <div key={i} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{e.school}</p>
                              <p className="text-sm text-gray-600 dark:text-slate-300">
                                {e.major} — {e.degree}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {e.start_date} — {e.end_date || t("common.present")}
                            </span>
                          </div>
                          {e.gpa && (
                            <p className="mt-1 text-sm">
                              {t("common.gpa")}: <span className="font-medium">{e.gpa}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {t("adminUsermanagement.noInformationYet")}
                    </span>
                  )}
                </section>

                {/* Certifications & Achievements */}
                {((profile.certifications ?? []).length > 0 ||
                  (profile.achievements ?? []).length > 0) && (
                  <>
                    <Separator />
                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Certifications */}
                      {(profile.certifications ?? []).length > 0 && (
                        <section>
                          <div className="mb-3 flex items-center gap-2">
                            <Award className="h-4 w-4 text-yellow-600" />
                            <h3 className="text-base font-semibold">{t("common.certificate")}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {profile.certifications!.map((c) => (
                              <Badge key={c} variant="secondary" className="px-3 py-1">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Achievements */}
                      {(profile.achievements ?? []).length > 0 && (
                        <section>
                          <div className="mb-3 flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-500" />
                            <h3 className="text-base font-semibold">{t("common.achievements")}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {profile.achievements!.map((a) => (
                              <Badge key={a} variant="outline" className="px-3 py-1">
                                {a}
                              </Badge>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  </>
                )}

                {/* Timestamps */}
                {(profile.createdAt || profile.updatedAt) && (
                  <>
                    <Separator />
                    <div className="flex gap-6 text-xs text-gray-400 dark:text-slate-500">
                      {profile.createdAt && (
                        <span>
                          {t("common.create")} {formatDate(profile.createdAt)}
                        </span>
                      )}
                      {profile.updatedAt && (
                        <span>
                          {t("common.update")} {formatDate(profile.updatedAt)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              {t("adminUsermanagement.noInformationYet")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
