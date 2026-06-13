import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CandidateProfile,
  EducationEntry,
  ProjectDetail,
  WorkExperience,
} from "@/interfaces/schema.types";
import {
  Award,
  BookOpen,
  Briefcase,
  Code2,
  Edit3,
  GraduationCap,
  Plus,
  Target,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ListField, SkillField } from "./useCandidateProfileForm";
import { buildSkillTabs } from "./useCandidateProfileForm";

interface BasicInfoEditProps {
  mode: "edit";
  formData: Partial<CandidateProfile>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<CandidateProfile>>>;
}

interface BasicInfoViewProps {
  mode: "view";
  profile: CandidateProfile;
}

type BasicInfoSectionProps = BasicInfoEditProps | BasicInfoViewProps;

export function BasicInfoSection(props: BasicInfoSectionProps) {
  const { t } = useTranslation();
  if (props.mode === "view") {
    const { profile } = props;
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
            <Target className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
            {t("common.basicInformation")}
          </h3>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
            <p className="mb-1 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
              {t("common.targetRole")}
            </p>
            <p className="font-medium text-[#0b1c30] dark:text-white">
              {profile.targetRole || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
            <p className="mb-1 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
              {t("common.level")}
            </p>
            <p className="font-medium text-[#0b1c30] dark:text-white">
              {profile.targetLevel || "—"}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
          <p className="mb-1 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
            {t("common.introduce")}
          </p>
          <p className="text-sm leading-relaxed text-[#0b1c30] dark:text-white">
            {profile.introduction || "—"}
          </p>
        </div>
      </div>
    );
  }

  const { formData, setFormData } = props;
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
          <Edit3 className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
        </div>
        <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
          {t("common.basicInformation")}
        </h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="mb-1 block text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
            {t("common.targetRole")}
          </Label>
          <Input
            value={formData.targetRole ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                targetRole: e.target.value,
              }))
            }
            placeholder={t("userAccount.exampleSoftwareEngineer")}
            className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
          />
        </div>
        <div>
          <Label className="mb-1 block text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
            {t("common.level")}
          </Label>
          <Input
            value={formData.targetLevel ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                targetLevel: e.target.value,
              }))
            }
            placeholder={t("userAiinterview.placeholderLevel")}
            className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
          />
        </div>
      </div>
      <div className="mt-4">
        <Label className="mb-1 block text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
          {t("common.introduce")}
        </Label>
        <textarea
          className="mt-1 w-full rounded-xl border border-[#c6c6cd] bg-white p-3 text-sm transition-colors focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 focus:outline-none dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white dark:focus:border-[#66B2FF] dark:focus:ring-[#66B2FF]/20"
          rows={4}
          value={formData.introduction ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              introduction: e.target.value,
            }))
          }
          placeholder={t("userAccount.introducingMyself")}
        />
      </div>
    </div>
  );
}

// ============================================================
// Skills Section
// ============================================================

interface SkillsEditProps {
  mode: "edit";
  activeSkillTab: SkillField;
  setActiveSkillTab: (tab: SkillField) => void;
  newSkillValue: Record<SkillField, string>;
  setNewSkillValue: React.Dispatch<React.SetStateAction<Record<SkillField, string>>>;
  techSkillsInput: string[];
  softSkillsInput: string[];
  toolsInput: string[];
  certificationsInput: string[];
  achievementsInput: string[];
  getSkillList: (field: SkillField) => string[];
  addSkillBadge: (field: SkillField) => void;
  removeSkillBadge: (field: SkillField, index: number) => void;
  addListItem: (field: Exclude<ListField, SkillField>) => void;
  updateListItem: (field: Exclude<ListField, SkillField>, index: number, value: string) => void;
  removeListItem: (field: Exclude<ListField, SkillField>, index: number) => void;
}

interface SkillsViewProps {
  mode: "view";
  profile: CandidateProfile;
}

type SkillsSectionProps = SkillsEditProps | SkillsViewProps;

export function SkillsSection(props: SkillsSectionProps) {
  const { t } = useTranslation();

  if (props.mode === "view") {
    const { profile } = props;
    return (
      <div className="flex flex-col gap-6">
        {/* Skills Card */}
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <Code2 className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("common.skill")}
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                {t("common.technicalSkills")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(profile.technicalSkills ?? []).length > 0 ? (
                  profile.technicalSkills!.map((skill) => (
                    <Badge
                      key={skill}
                      className="rounded-full bg-[#0058be]/10 px-3 py-1 text-xs font-medium text-[#0058be] dark:bg-[#0058be]/30 dark:text-[#66B2FF]">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[#45464d] dark:text-[#8f9099]">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                {t("common.softSkills")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(profile.softSkills ?? []).length > 0 ? (
                  profile.softSkills!.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="rounded-full border-[#c6c6cd] px-3 py-1 text-xs font-medium text-[#45464d] dark:border-[#3a4558] dark:text-[#8f9099]">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[#45464d] dark:text-[#8f9099]">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                {t("common.tools")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(profile.tools ?? []).length > 0 ? (
                  profile.tools!.map((tool) => (
                    <Badge
                      key={tool}
                      className="rounded-full bg-[#0058be]/10 px-3 py-1 text-xs font-medium text-[#0058be] dark:bg-[#0058be]/30 dark:text-[#66B2FF]">
                      {tool}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[#45464d] dark:text-[#8f9099]">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Certificates & Achievements Card */}
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <Award className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("userAccount.certificatesAchievements")}
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                {t("common.certificate")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(profile.certifications ?? []).length > 0 ? (
                  profile.certifications!.map((cert) => (
                    <Badge
                      key={cert}
                      className="rounded-full bg-[#0058be]/10 px-3 py-1 text-xs font-medium text-[#0058be] dark:bg-[#0058be]/30 dark:text-[#66B2FF]">
                      {cert}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[#45464d] dark:text-[#8f9099]">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-[#45464d] uppercase dark:text-[#8f9099]">
                {t("common.achievements")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(profile.achievements ?? []).length > 0 ? (
                  profile.achievements!.map((ach) => (
                    <Badge
                      key={ach}
                      variant="outline"
                      className="rounded-full border-[#c6c6cd] px-3 py-1 text-xs font-medium text-[#45464d] dark:border-[#3a4558] dark:text-[#8f9099]">
                      {ach}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-[#45464d] dark:text-[#8f9099]">—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    activeSkillTab,
    setActiveSkillTab,
    newSkillValue,
    setNewSkillValue,
    techSkillsInput,
    softSkillsInput,
    toolsInput,
    certificationsInput,
    achievementsInput,
    getSkillList,
    addSkillBadge,
    removeSkillBadge,
    addListItem,
    updateListItem,
    removeListItem,
  } = props;

  const activeSkills = getSkillList(activeSkillTab);
  const skillTabs = buildSkillTabs(t);
  const skillCounts: Record<SkillField, number> = {
    technicalSkills: techSkillsInput.filter(Boolean).length,
    softSkills: softSkillsInput.filter(Boolean).length,
    tools: toolsInput.filter(Boolean).length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Skills Card */}
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
            <Code2 className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
            {t("common.skill")}
          </h3>
        </div>

        {/* Tab selector */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {skillTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSkillTab(tab.key)}
              className={
                activeSkillTab === tab.key
                  ? "flex flex-col items-center justify-center rounded-xl border-2 border-[#0058be] bg-[#dae2fd] p-3 text-center transition-all dark:border-[#66B2FF] dark:bg-[#0058be]/30"
                  : "flex flex-col items-center justify-center rounded-xl border border-[#c6c6cd] bg-white p-3 text-center text-[#45464d] transition-all hover:border-[#0058be] hover:bg-[#eff4ff] dark:border-[#3a4558] dark:bg-[#131b2e] dark:text-[#8f9099] dark:hover:border-[#66B2FF] dark:hover:bg-[#1a2a3a]"
              }>
              <span className="text-2xl font-bold text-[#0058be] dark:text-[#66B2FF]">
                {skillCounts[tab.key]}
              </span>
              <span className="mt-0.5 text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Skill input area */}
        <div className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
              {skillTabs.find((s) => s.key === activeSkillTab)?.label}
            </Label>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {activeSkills.length > 0 ? (
              activeSkills.map((skill, index) => (
                <Badge
                  key={`${activeSkillTab}-${skill}-${index}`}
                  className="flex items-center gap-1.5 rounded-full bg-[#0058be]/10 px-3 py-1 pr-1.5 text-xs font-medium text-[#0058be] dark:bg-[#0058be]/30 dark:text-[#66B2FF]">
                  <span>{skill}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-[#0058be]/20"
                    onClick={() => removeSkillBadge(activeSkillTab, index)}
                    aria-label={t("common.deleteVar0", { var_0: skill })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-sm text-[#45464d] dark:text-[#8f9099]">
                {t("userAccount.noDataYet")}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={newSkillValue[activeSkillTab]}
              onChange={(e) =>
                setNewSkillValue((prev) => ({
                  ...prev,
                  [activeSkillTab]: e.target.value,
                }))
              }
              placeholder={t("userAccount.enterTheSkillAndTap")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkillBadge(activeSkillTab);
                }
              }}
              className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addSkillBadge(activeSkillTab)}
              className="border-[#0058be] text-[#0058be] hover:bg-[#dae2fd] dark:border-[#66B2FF] dark:text-[#66B2FF] dark:hover:bg-[#0058be]/20">
              <Plus className="mr-1 h-4 w-4" />
              {t("common.more")}
            </Button>
          </div>
        </div>
      </div>

      {/* Certificates & Achievements Card */}
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
            <Award className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
            {t("userAccount.certificatesAchievements")}
          </h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
                {t("common.certificate")}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addListItem("certifications")}
                className="border-[#c6c6cd] text-[#45464d] hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("common.more")}
              </Button>
            </div>
            <div className="space-y-2">
              {(certificationsInput.length > 0 ? certificationsInput : [""]).map((cert, index) => (
                <div key={`cert-${index}`} className="flex items-center gap-2">
                  <Input
                    value={cert}
                    onChange={(e) => updateListItem("certifications", index, e.target.value)}
                    placeholder={t("userAccount.exampleAwsSolutionArchitect")}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeListItem("certifications", index)}
                    disabled={certificationsInput.length <= 1}
                    className="h-9 w-9 shrink-0 text-[#45464d] hover:bg-red-50 hover:text-red-500 dark:text-[#8f9099] dark:hover:bg-red-900/20 dark:hover:text-red-400">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
                {t("common.achievements")}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addListItem("achievements")}
                className="border-[#c6c6cd] text-[#45464d] hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("common.more")}
              </Button>
            </div>
            <div className="space-y-2">
              {(achievementsInput.length > 0 ? achievementsInput : [""]).map(
                (achievement, index) => (
                  <div key={`achievement-${index}`} className="flex items-center gap-2">
                    <Input
                      value={achievement}
                      onChange={(e) => updateListItem("achievements", index, e.target.value)}
                      placeholder={t("userAccount.exampleListOfExcellentStudents")}
                      className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeListItem("achievements", index)}
                      disabled={achievementsInput.length <= 1}
                      className="h-9 w-9 shrink-0 text-[#45464d] hover:bg-red-50 hover:text-red-500 dark:text-[#8f9099] dark:hover:bg-red-900/20 dark:hover:text-red-400">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Experience Section
// ============================================================

interface ExperienceEditProps {
  mode: "edit";
  formData: Partial<CandidateProfile>;
  addProject: () => void;
  updateProject: (
    index: number,
    field: keyof ProjectDetail,
    value: string | number | string[]
  ) => void;
  removeProject: (index: number) => void;
  addWorkExperience: () => void;
  updateWorkExperience: (index: number, field: keyof WorkExperience, value: string) => void;
  removeWorkExperience: (index: number) => void;
  addEducation: () => void;
  updateEducation: (index: number, field: keyof EducationEntry, value: string) => void;
  removeEducation: (index: number) => void;
}

interface ExperienceViewProps {
  mode: "view";
  profile: CandidateProfile;
}

type ExperienceSectionProps = ExperienceEditProps | ExperienceViewProps;

export function ExperienceSection(props: ExperienceSectionProps) {
  const { t } = useTranslation();

  if (props.mode === "view") {
    const { profile } = props;
    return (
      <div className="flex flex-col gap-6">
        {/* Projects Card */}
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <Briefcase className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("common.project")}
            </h3>
          </div>
          {(profile.projects ?? []).length > 0 ? (
            <div className="space-y-3">
              {profile.projects!.map((project, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
                  <h4 className="font-semibold text-[#0b1c30] dark:text-white">{project.name}</h4>
                  <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-[#45464d] dark:text-[#8f9099]">
                    {project.description}
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-[#76777d] dark:text-[#8f9099]">
                    {project.role && (
                      <p>
                        {t("general.role")} {project.role}
                      </p>
                    )}
                    {project.teamSize && (
                      <p>
                        {t("common.team")} {project.teamSize} {t("common.people")}
                      </p>
                    )}
                    {project.outcome && (
                      <p className="whitespace-pre-wrap">
                        {t("common.result1")} {project.outcome}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#45464d] dark:text-[#8f9099]">
              {t("userAccount.thereAreNoProjectsYet")}
            </p>
          )}
        </div>

        {/* Work Experience Card */}
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <BookOpen className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("common.workExperience")}
            </h3>
          </div>
          {(profile.workExperiences ?? []).length > 0 ? (
            <div className="space-y-3">
              {profile.workExperiences!.map((exp, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-[#0b1c30] dark:text-white">
                        {exp.position}
                      </h4>
                      <p className="text-sm text-[#45464d] dark:text-[#8f9099]">{exp.company}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[#0b1c30] dark:text-white">{exp.description}</p>
                  <p className="mt-2 text-xs text-[#76777d] dark:text-[#8f9099]">
                    {exp.start_date} — {exp.end_date || t("common.present")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#45464d] dark:text-[#8f9099]">
              {t("userAccount.noExperienceYet")}
            </p>
          )}
        </div>

        {/* Education Card */}
        <div className="glass-card rounded-xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <GraduationCap className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("common.education")}
            </h3>
          </div>
          {(profile.educations ?? []).length > 0 ? (
            <div className="space-y-3">
              {profile.educations!.map((edu, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
                  <h4 className="font-semibold text-[#0b1c30] dark:text-white">{edu.school}</h4>
                  <p className="text-sm text-[#45464d] dark:text-[#8f9099]">
                    {edu.major} — {edu.degree}
                  </p>
                  {edu.gpa && (
                    <p className="mt-1 text-sm text-[#0b1c30] dark:text-white">
                      {t("common.gpa")}: {edu.gpa}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[#76777d] dark:text-[#8f9099]">
                    {edu.start_date} — {edu.end_date || t("common.present")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#45464d] dark:text-[#8f9099]">
              {t("userAccount.noEducationInformationAvailable")}
            </p>
          )}
        </div>
      </div>
    );
  }

  const {
    formData,
    addProject,
    updateProject,
    removeProject,
    addWorkExperience,
    updateWorkExperience,
    removeWorkExperience,
    addEducation,
    updateEducation,
    removeEducation,
  } = props;

  return (
    <div className="flex flex-col gap-6">
      {/* Projects Card */}
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <Briefcase className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("common.project")}
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addProject}
            className="border-[#0058be] text-[#0058be] hover:bg-[#dae2fd] dark:border-[#66B2FF] dark:text-[#66B2FF] dark:hover:bg-[#0058be]/20">
            <Plus className="mr-1 h-4 w-4" />
            {t("common.addProject")}
          </Button>
        </div>
        <div className="space-y-4">
          {(formData.projects ?? []).map((project, index) => (
            <div
              key={index}
              className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
                  {t("common.project")} {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProject(index)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300">
                  {t("general.delete")}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.projectName")}
                  </Label>
                  <Input
                    value={project.name ?? ""}
                    onChange={(e) => updateProject(index, "name", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.role")}
                  </Label>
                  <Input
                    value={project.role ?? ""}
                    onChange={(e) => updateProject(index, "role", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                  {t("common.describe")}
                </Label>
                <textarea
                  className="mt-1 min-h-24 w-full rounded-xl border border-[#c6c6cd] bg-white p-3 text-sm transition-colors focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 focus:outline-none dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white dark:focus:border-[#66B2FF] dark:focus:ring-[#66B2FF]/20"
                  value={project.description ?? ""}
                  onChange={(e) => updateProject(index, "description", e.target.value)}
                  rows={4}
                />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("userAccount.teamSize")}
                  </Label>
                  <Input
                    type="number"
                    value={project.teamSize ?? 1}
                    onChange={(e) => updateProject(index, "teamSize", Number(e.target.value))}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.result")}
                  </Label>
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-xl border border-[#c6c6cd] bg-white p-3 text-sm transition-colors focus:border-[#0058be] focus:ring-2 focus:ring-[#0058be]/20 focus:outline-none dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white dark:focus:border-[#66B2FF] dark:focus:ring-[#66B2FF]/20"
                    value={project.outcome ?? ""}
                    onChange={(e) => updateProject(index, "outcome", e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          ))}
          {(formData.projects ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-[#45464d] dark:text-[#8f9099]">
              {t("userAccount.thereAreNoProjectsYet1")}
            </p>
          )}
        </div>
      </div>

      {/* Work Experience Card */}
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <BookOpen className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("common.workExperience")}
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addWorkExperience}
            className="border-[#0058be] text-[#0058be] hover:bg-[#dae2fd] dark:border-[#66B2FF] dark:text-[#66B2FF] dark:hover:bg-[#0058be]/20">
            <Plus className="mr-1 h-4 w-4" />
            {t("common.moreExperience")}
          </Button>
        </div>
        <div className="space-y-4">
          {(formData.workExperiences ?? []).map((exp, index) => (
            <div
              key={index}
              className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
                  {t("common.experience")} {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWorkExperience(index)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300">
                  {t("general.delete")}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.company")}
                  </Label>
                  <Input
                    value={exp.company ?? ""}
                    onChange={(e) => updateWorkExperience(index, "company", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.location1")}
                  </Label>
                  <Input
                    value={exp.position ?? ""}
                    onChange={(e) => updateWorkExperience(index, "position", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                  {t("common.describe")}
                </Label>
                <Input
                  value={exp.description ?? ""}
                  onChange={(e) => updateWorkExperience(index, "description", e.target.value)}
                  className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.startDate")}
                  </Label>
                  <Input
                    type="date"
                    value={exp.start_date ?? ""}
                    onChange={(e) => updateWorkExperience(index, "start_date", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.endDate")}
                  </Label>
                  <Input
                    type="date"
                    value={exp.end_date ?? ""}
                    onChange={(e) => updateWorkExperience(index, "end_date", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
          {(formData.workExperiences ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-[#45464d] dark:text-[#8f9099]">
              {t("userAccount.noExperienceYetClickQuot")}
            </p>
          )}
        </div>
      </div>

      {/* Education Card */}
      <div className="glass-card rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dae2fd] dark:bg-[#0058be]/30">
              <GraduationCap className="h-5 w-5 text-[#0058be] dark:text-[#66B2FF]" />
            </div>
            <h3 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
              {t("common.education")}
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addEducation}
            className="border-[#0058be] text-[#0058be] hover:bg-[#dae2fd] dark:border-[#66B2FF] dark:text-[#66B2FF] dark:hover:bg-[#0058be]/20">
            <Plus className="mr-1 h-4 w-4" />
            {t("common.moreEducation")}
          </Button>
        </div>
        <div className="space-y-4">
          {(formData.educations ?? []).map((edu, index) => (
            <div
              key={index}
              className="rounded-xl border border-[rgba(15,23,42,0.1)] bg-white p-4 dark:border-[rgba(255,255,255,0.08)] dark:bg-[#131b2e]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#45464d] dark:text-[#8f9099]">
                  {t("common.education")} {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEducation(index)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300">
                  {t("general.delete")}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.school")}
                  </Label>
                  <Input
                    value={edu.school ?? ""}
                    onChange={(e) => updateEducation(index, "school", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.specialized")}
                  </Label>
                  <Input
                    value={edu.major ?? ""}
                    onChange={(e) => updateEducation(index, "major", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.degree")}
                  </Label>
                  <Input
                    value={edu.degree ?? ""}
                    onChange={(e) => updateEducation(index, "degree", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.gpa")}
                  </Label>
                  <Input
                    value={edu.gpa ?? ""}
                    onChange={(e) => updateEducation(index, "gpa", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.startDate")}
                  </Label>
                  <Input
                    type="date"
                    value={edu.start_date ?? ""}
                    onChange={(e) => updateEducation(index, "start_date", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-[#45464d] dark:text-[#8f9099]">
                    {t("common.endDate")}
                  </Label>
                  <Input
                    type="date"
                    value={edu.end_date ?? ""}
                    onChange={(e) => updateEducation(index, "end_date", e.target.value)}
                    className="border-[#c6c6cd] bg-white dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
          {(formData.educations ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-[#45464d] dark:text-[#8f9099]">
              {t("userAccount.noEducationYetClickQuot")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
