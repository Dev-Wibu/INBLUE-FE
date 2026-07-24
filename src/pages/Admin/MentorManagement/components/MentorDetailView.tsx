/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatting";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Code,
  Edit,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Mentor } from "../types";
import { MentorEditForm, type ExtendedMentorFormData } from "./MentorEditForm";

interface MentorDetailViewProps {
  mentor: Mentor;
  onBack: () => void;
  formData: ExtendedMentorFormData;
  onFormChange: (data: ExtendedMentorFormData) => void;
  onSubmit: () => void;
}

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

export function MentorDetailView({
  mentor,
  formData,
  onFormChange,
  onSubmit,
}: MentorDetailViewProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async () => {
    await onSubmit();
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const sections = [
    { id: "basic-info", label: t("common.basicInfo", "Thông tin cơ bản") },
    { id: "professional-info", label: t("common.professionalInfo", "Thông tin nghề nghiệp") },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Sticky Profile Info */}
        <div className="hidden w-80 flex-shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50/50 p-6 lg:flex dark:border-slate-800 dark:bg-slate-900/20">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md dark:border-slate-800">
              {mentor.avatarUrl ? (
                <img
                  src={mentor.avatarUrl}
                  alt={mentor.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-100 text-3xl font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {mentor.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{mentor.name}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{mentor.email}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge variant={mentor.active !== false ? "default" : "destructive"}>
                {mentor.active !== false ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>
          </div>

          <div className="mt-8">
            <h4 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              {t("common.navigation", "Điều hướng")}
            </h4>
            <div className="flex flex-col gap-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200">
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8 dark:bg-slate-950">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("common.experience")}
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {mentor.yearsOfExperience || 0}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    {t("common.year")}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("adminMentormanagement.numberOfSessions")}
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {mentor.totalSession || 0}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {t("adminMentormanagement.unitPricePerMinuteVnd")}
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {mentor.pricePerMinute ? formatCurrency(mentor.pricePerMinute) : "-"}
                </div>
              </div>
            </div>

            {isEditing ? (
              <CollapsibleCard title={t("adminMentormanagement.editMentor")} icon={Edit}>
                <MentorEditForm
                  formData={formData}
                  onFormChange={onFormChange}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  selectedMentor={mentor}
                />
              </CollapsibleCard>
            ) : (
              <>
                <CollapsibleCard
                  id="basic-info"
                  title={t("common.basicInfo", "Thông tin cơ bản")}
                  icon={UserIcon}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {t("common.basicInfo", "Thông tin cơ bản")}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t("general.edit")}
                      </Button>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">
                          {t("common.fullName1")}
                        </p>
                        <p className="text-base text-slate-900 dark:text-white">
                          {mentor.name || "-"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">{t("common.email")}</p>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <p className="text-base text-slate-900 dark:text-white">
                            {mentor.email || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-sm font-medium text-slate-500">
                          {t("common.introduceYourself")}
                        </p>
                        <p className="text-base whitespace-pre-wrap text-slate-900 dark:text-white">
                          {mentor.bio || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>

                <CollapsibleCard
                  id="professional-info"
                  title={t("common.professionalInfo", "Thông tin nghề nghiệp")}
                  icon={Briefcase}>
                  <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">
                          {t("common.currentCompany")}
                        </p>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-slate-400" />
                          <p className="text-base text-slate-900 dark:text-white">
                            {mentor.currentCompany || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-500">
                          {t("common.linkedinLink")}
                        </p>
                        <div className="flex items-center gap-2">
                          {mentor.linkedInUrl ? (
                            <a
                              href={mentor.linkedInUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline dark:text-blue-400">
                              {mentor.linkedInUrl}
                            </a>
                          ) : (
                            <p className="text-base text-slate-900 dark:text-white">-</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-sm font-medium text-slate-500">
                          {t("common.expertise")}
                        </p>
                        <div className="flex items-center gap-2">
                          <Code className="mt-1 h-4 w-4 self-start text-slate-400" />
                          <p className="text-base whitespace-pre-wrap text-slate-900 dark:text-white">
                            {mentor.expertise || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
