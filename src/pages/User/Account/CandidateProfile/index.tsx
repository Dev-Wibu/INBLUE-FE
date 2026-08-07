/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Code,
  FolderOpen,
  GraduationCap,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BasicInfoSection } from "./BasicInfoSection";
import { ExperienceSection } from "./ExperienceSection";
import { SkillsSection } from "./SkillsSection";
import { useCandidateProfileForm } from "./useCandidateProfileForm";

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

export function CandidateProfileTab() {
  const { t } = useTranslation();
  const form = useCandidateProfileForm();

  if (form.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (form.error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-8 text-center">
          <p className="text-red-500">{t("userAccount.unableToDownloadCandidateProfile")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!form.hasProfile && !form.isEditing) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0px_6px_20px_0px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("common.candidateProfile")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("userAccount.createAProfileSoMentors")}
          </p>
        </div>

        <Card className="border-emerald-100 dark:border-slate-800">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold">{t("common.thereAreNoCandidateProfilesYet")}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              {t("userAccount.createACandidateProfileSo")}
            </p>
            <Button className="mt-4" onClick={form.startEditing}>
              {t("userAccount.createProfile")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (form.isEditing) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0px_6px_20px_0px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {form.hasProfile
                  ? t("userAccount.editCandidateProfile")
                  : t("userAccount.createCandidateProfiles")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("userAccount.completeInformationToIncreaseYour")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={form.cancelEditing}>
                {t("general.cancel")}
              </Button>
              <Button
                onClick={form.handleSave}
                disabled={form.createMutation.isPending || form.updateMutation.isPending}>
                {form.createMutation.isPending || form.updateMutation.isPending
                  ? t("common.saving")
                  : form.hasProfile
                    ? t("general.update")
                    : t("userAccount.createProfile")}
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

  const profile = form.profile!;
  return (
    <div className="flex flex-col gap-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("common.candidateProfile")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("userAccount.overviewOfYourApplicationProfile")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {form.profiles.length > 1 && (
              <Select
                value={form.selectedProfileId ? String(form.selectedProfileId) : undefined}
                onValueChange={(value) => form.setSelectedProfileId(Number(value))}>
                <SelectTrigger className="min-h-10 min-w-52">
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  {form.profiles
                    .filter((profileItem) => profileItem.id !== undefined)
                    .map((profileItem) => (
                      <SelectItem key={profileItem.id} value={String(profileItem.id)}>
                        {profileItem.applicationId
                          ? `Application #${profileItem.applicationId}`
                          : `Profile #${profileItem.id}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={form.startEditing}>{t("general.edit")}</Button>
          </div>
        </div>
      </div>

      {/* Introduction */}
      {profile.introduction && (
        <CollapsibleCard id="intro" title={t("common.introduce")} icon={UserIcon}>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {profile.introduction}
          </p>
        </CollapsibleCard>
      )}

      {/* Skills & Tools */}
      <CollapsibleCard id="skills" title={t("common.technicalSkills")} icon={Code}>
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
                <span className="text-sm text-slate-400">—</span>
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
                <span className="text-sm text-slate-400">—</span>
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
                <span className="text-sm text-slate-400">—</span>
              )}
            </div>
          </section>
        </div>
      </CollapsibleCard>

      {/* Work Experience */}
      <CollapsibleCard id="experience" title={t("common.workExperience")} icon={Briefcase}>
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
          <p className="text-sm text-slate-400">—</p>
        )}
      </CollapsibleCard>

      {/* Projects */}
      <CollapsibleCard id="projects" title={t("common.project")} icon={FolderOpen}>
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
          <p className="text-sm text-slate-400">—</p>
        )}
      </CollapsibleCard>

      {/* Education */}
      <CollapsibleCard id="education" title={t("common.education")} icon={GraduationCap}>
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
                      <span className="font-semibold text-slate-900 dark:text-white">{e.gpa}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">—</p>
        )}
      </CollapsibleCard>

      {/* Certifications */}
      <CollapsibleCard id="certifications" title={t("common.certifications")} icon={Award}>
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
          <p className="text-sm text-slate-400">—</p>
        )}
      </CollapsibleCard>

      {/* Achievements */}
      <CollapsibleCard id="achievements" title={t("common.achievements")} icon={Trophy}>
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
          <p className="text-sm text-slate-400">—</p>
        )}
      </CollapsibleCard>
    </div>
  );
}
