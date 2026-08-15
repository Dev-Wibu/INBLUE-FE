import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatting";
import {
  ArrowLeft,
  Award,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Globe,
  Mail,
  Pencil,
  User as UserIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
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

interface CollapsibleCardProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
}

function CollapsibleCard({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  id,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />}
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
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
  onBack,
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

  const parsedSkills = useMemo(() => {
    if (!mentor.expertise) return [];
    return mentor.expertise
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [mentor.expertise]);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full px-4 pt-4 pb-8 md:px-6 lg:px-8">
      <div className="w-full">
        {isEditing ? (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t("adminMentormanagement.editMentor", "Chỉnh sửa thông tin Mentor")}
                </h3>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  {t("general.cancel", "Hủy")}
                </Button>
              </div>
              <MentorEditForm
                formData={formData}
                onFormChange={onFormChange}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                selectedMentor={mentor}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left Column: Sticky Profile Card */}
            <div className="lg:sticky lg:top-0 lg:col-span-3 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative h-24 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-blue-500/15 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-blue-500/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="absolute top-2.5 left-2.5 h-8 gap-1.5 rounded-full bg-white/80 px-3 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
                    title={t("common.back", "Quay lại danh sách")}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>{t("common.back", "Quay lại")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-white/80 text-slate-600 shadow-xs backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                    title={t("general.edit")}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="relative px-5 pb-5 text-center">
                  <div className="-mt-12 mb-3 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md dark:border-slate-900 dark:bg-slate-800">
                    {mentor.avatarUrl ? (
                      <img
                        src={mentor.avatarUrl}
                        alt={mentor.name || t("common.avatar", "Avatar")}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-2xl font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {mentor.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {mentor.name}
                  </h3>

                  {/* Subtitle: Current Company */}
                  {mentor.currentCompany && (
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="font-medium">{mentor.currentCompany}</span>
                    </div>
                  )}

                  {/* Metadata List */}
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
                    <div className="flex items-center justify-center gap-2 px-1">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                      <span className="truncate">{mentor.email}</span>
                    </div>
                    {mentor.linkedInUrl && (
                      <div className="flex items-center justify-center gap-2 px-1">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                        <a
                          href={mentor.linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-blue-600 hover:underline dark:text-blue-400">
                          {mentor.linkedInUrl.replace(/^https?:\/\//i, "")}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                    <Badge
                      className={
                        mentor.active !== false
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }>
                      {mentor.active !== false
                        ? t("common.active", "Hoạt động")
                        : t("common.inactive", "Đã tắt")}
                    </Badge>
                    {mentor.yearsOfExperience && (
                      <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-medium">
                        {mentor.yearsOfExperience} {t("common.yearsExp", "năm kinh nghiệm")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column: Detail Content */}
            <div className="space-y-6 lg:col-span-7">
              {/* Header Stats Overview Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {t("adminMentormanagement.mentorProfileOverview", "Hồ sơ Chuyên gia Mentor")}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t(
                        "adminMentormanagement.overviewDescription",
                        "Tổng quan chỉ số hoạt động và dịch vụ hướng dẫn"
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{t("common.experience", "Kinh nghiệm")}</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
                      {mentor.yearsOfExperience || 0}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        {t("adminLabels.mentorYears")}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Award className="h-3.5 w-3.5 text-teal-500" />
                      <span>{t("adminMentormanagement.numberOfSessions", "Số buổi đã dạy")}</span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white">
                      {mentor.totalSession || 0}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        {t("adminLabels.mentorSessions")}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/40">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        {t("adminMentormanagement.unitPricePerMinuteVnd", "Đơn giá / phút")}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {mentor.pricePerMinute ? formatCurrency(mentor.pricePerMinute) : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info Card */}
              <CollapsibleCard
                id="basic-info"
                title={t("common.basicInfo", "Thông tin cơ bản")}
                icon={UserIcon}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                      {t("common.fullName1", "Họ & Tên")}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {mentor.name || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                      {t("common.email", "Email liên hệ")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {mentor.email || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-medium text-slate-500">
                      {t("common.introduceYourself", "Giới thiệu bản thân")}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {mentor.bio || "-"}
                    </p>
                  </div>
                </div>
              </CollapsibleCard>

              {/* Professional Info Card */}
              <CollapsibleCard
                id="professional-info"
                title={t("common.professionalInfo", "Thông tin nghề nghiệp")}
                icon={Briefcase}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                      {t("common.currentCompany", "Công ty hiện tại")}
                    </p>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {mentor.currentCompany || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                      {t("common.linkedinLink", "Đường dẫn LinkedIn")}
                    </p>
                    <div className="flex items-center gap-2">
                      {mentor.linkedInUrl ? (
                        <a
                          href={mentor.linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                          {mentor.linkedInUrl}
                        </a>
                      ) : (
                        <p className="text-sm text-slate-400">-</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-xs font-medium text-slate-500">
                      {t("common.expertise", "Lĩnh vực chuyên môn")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {parsedSkills.length > 0 ? (
                        parsedSkills.map((skill, index) => (
                          <Badge
                            key={index}
                            className="border-none bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleCard>
            </div>

            {/* Right Column: Sticky Table of Contents */}
            <div className="hidden lg:sticky lg:top-0 lg:col-span-2 lg:block lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h4 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("common.tableOfContents", "Nội dung")}
                </h4>
                <nav className="space-y-1">
                  <a
                    href="#basic-info"
                    onClick={(e) => scrollToSection(e, "basic-info")}
                    className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400">
                    {t("common.basicInfo", "Thông tin cơ bản")}
                  </a>
                  <a
                    href="#professional-info"
                    onClick={(e) => scrollToSection(e, "professional-info")}
                    className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400">
                    {t("common.professionalInfo", "Thông tin nghề nghiệp")}
                  </a>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
