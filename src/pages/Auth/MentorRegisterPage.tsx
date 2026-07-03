import { Footer, Header } from "@/components/layouts";
import { UniversalMediaUploader } from "@/components/shared/media/UniversalMediaUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { authManager } from "@/services/auth.manager";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

type MentorFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  bio: string;
  yearsOfExperience: string;
  expertise: string;
  linkedInUrl: string;
  currentCompany: string;
};
type MentorFieldKey = keyof MentorFormData | "avatarFile";

const FIELD_KEY_ALIASES: Record<string, MentorFieldKey> = {
  name: "name",
  fullname: "name",
  email: "email",
  password: "password",
  confirmpassword: "confirmPassword",
  bio: "bio",
  yearsofexperience: "yearsOfExperience",
  expertise: "expertise",
  linkedinurl: "linkedInUrl",
  currentcompany: "currentCompany",
  avatar: "avatarFile",
  avatarfile: "avatarFile",
};
const normalizeFieldErrors = (
  rawErrors?: Record<string, string>
): Partial<Record<MentorFieldKey, string>> => {
  if (!rawErrors) {
    return {};
  }
  return Object.entries(rawErrors).reduce<Partial<Record<MentorFieldKey, string>>>(
    (acc, [rawKey, message]) => {
      const normalizedKey = rawKey
        .replace(/^data\./, "")
        .replace(/\[(\d+)\]/g, "")
        .replace(/_/g, "")
        .toLowerCase();
      const mappedKey = FIELD_KEY_ALIASES[normalizedKey];
      if (mappedKey && message.trim().length > 0) {
        acc[mappedKey] = message;
      }
      return acc;
    },
    {}
  );
};

export function MentorRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<MentorFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
    yearsOfExperience: "",
    expertise: "",
    linkedInUrl: "",
    currentCompany: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MentorFieldKey, string>>>({});
  const clearFieldError = useCallback((field: MentorFieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = {
        ...prev,
      };
      delete next[field];
      return next;
    });
  }, []);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const fieldName = e.target.name as keyof MentorFormData;
    setFormData((prev) => ({
      ...prev,
      [fieldName]: e.target.value,
    }));
    clearFieldError(fieldName);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const clientFieldErrors: Partial<Record<MentorFieldKey, string>> = {};
    if (!formData.name.trim())
      clientFieldErrors.name = t("authMentorregisterpage.pleaseEnterYourFirstAnd");
    if (!formData.email.trim())
      clientFieldErrors.email = t("authMentorregisterpage.pleaseEnterEmail");
    if (!formData.password.trim())
      clientFieldErrors.password = t("authMentorregisterpage.pleaseEnterYourPassword");
    if (!formData.confirmPassword.trim()) {
      clientFieldErrors.confirmPassword = t("authMentorregisterpage.pleaseConfirmPassword");
    }
    if (!formData.currentCompany.trim()) {
      clientFieldErrors.currentCompany = t("authMentorregisterpage.pleaseEnterCurrentCompany");
    }
    if (!formData.expertise.trim()) {
      clientFieldErrors.expertise = t("authMentorregisterpage.pleaseEnterExpertise");
    }
    const yearsOfExperience = formData.yearsOfExperience ? Number(formData.yearsOfExperience) : 0;
    if (Number.isNaN(yearsOfExperience) || yearsOfExperience < 0) {
      clientFieldErrors.yearsOfExperience = t("authMentorregisterpage.experienceMustBeNonNegative");
    }
    if (formData.password !== formData.confirmPassword) {
      clientFieldErrors.confirmPassword = t("authMentorregisterpage.confirmationPasswordMismatch");
    }
    if (Object.keys(clientFieldErrors).length > 0) {
      setFieldErrors(clientFieldErrors);
      setError(t("authMentorregisterpage.pleaseDoubleCheckRequiredInformation"));
      return;
    }
    setFieldErrors({});
    setIsLoading(true);
    try {
      const result = await authManager.registerMentor({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        bio: formData.bio || undefined,
        expertise: formData.expertise,
        yearsOfExperience: yearsOfExperience || undefined,
        linkedInUrl: formData.linkedInUrl || undefined,
        currentCompany: formData.currentCompany,
        avatar: avatarFile ?? undefined,
      });
      if (result.success) {
        navigate("/waiting-accept");
        return;
      }
      const normalizedFieldErrors = normalizeFieldErrors(result.fieldErrors);
      if (Object.keys(normalizedFieldErrors).length > 0) {
        setFieldErrors(normalizedFieldErrors);
      }
      setError(result.error || t("authMentorregisterpage.registrationFailedPleaseCheckYour"));
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    navigate("/select-role");
  };
  const inputClass = (field: MentorFieldKey) =>
    cn(
      "border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500",
      "focus-visible:ring-[#0047AB]/25 dark:focus-visible:ring-[#66B2FF]/35",
      fieldErrors[field] &&
        "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200/60 dark:border-red-700 dark:focus-visible:border-red-500 dark:focus-visible:ring-red-900/40"
    );
  const helperTextClass = "text-xs font-medium text-red-600 dark:text-red-400";
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-slate-100 via-slate-50 to-blue-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <Header />

      <main className="flex-1 py-8 md:py-10">
        <div className="mx-auto w-full max-w-4xl px-4 md:px-6">
          <Link
            to="/select-role"
            className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[#0047AB] transition-colors hover:bg-[#0047AB]/10 dark:text-[#66B2FF] dark:hover:bg-[#66B2FF]/10">
            <ArrowLeft className="h-4 w-4" />
            {t("general.back")}
          </Link>

          <Card className="border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/40">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl text-slate-900 dark:text-white">
                {t("authMentorregisterpage.registerToBecomeAMentor")}
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                {t("authMentorregisterpage.provideProfessionalInformationAndVerification")}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
                    role="alert">
                    <p className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </p>
                  </div>
                )}

                <section className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("authMentorregisterpage.accountInformation")}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-200">
                        {t("common.fullName")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={t("common.nguyenVanA")}
                        className={inputClass("name")}
                        required
                      />
                      {fieldErrors.name && <p className={helperTextClass}>{fieldErrors.name}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t("common.emailPlaceholder")}
                        className={inputClass("email")}
                        required
                      />
                      {fieldErrors.email && <p className={helperTextClass}>{fieldErrors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">
                        {t("common.password")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t("common.enterPassword")}
                        className={inputClass("password")}
                        required
                      />
                      {fieldErrors.password && (
                        <p className={helperTextClass}>{fieldErrors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmPassword"
                        className="text-slate-700 dark:text-slate-200">
                        {t("common.confirmPassword")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder={t("common.reenterThePassword")}
                        className={inputClass("confirmPassword")}
                        required
                      />
                      {fieldErrors.confirmPassword && (
                        <p className={helperTextClass}>{fieldErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {t("common.careerInformation")}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="currentCompany"
                        className="text-slate-700 dark:text-slate-200">
                        {t("common.currentCompany")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="currentCompany"
                        name="currentCompany"
                        value={formData.currentCompany}
                        onChange={handleChange}
                        placeholder={t("authMentorregisterpage.currentCompanyName")}
                        className={inputClass("currentCompany")}
                        required
                      />
                      {fieldErrors.currentCompany && (
                        <p className={helperTextClass}>{fieldErrors.currentCompany}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="yearsOfExperience"
                        className="text-slate-700 dark:text-slate-200">
                        {t("common.numberOfYearsOfExperience")}{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="yearsOfExperience"
                        name="yearsOfExperience"
                        type="number"
                        min="0"
                        value={formData.yearsOfExperience}
                        onChange={handleChange}
                        placeholder="5"
                        className={inputClass("yearsOfExperience")}
                        required
                      />
                      {fieldErrors.yearsOfExperience && (
                        <p className={helperTextClass}>{fieldErrors.yearsOfExperience}</p>
                      )}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="linkedInUrl" className="text-slate-700 dark:text-slate-200">
                        {t("common.linkedinProfile")}
                      </Label>
                      <Input
                        id="linkedInUrl"
                        name="linkedInUrl"
                        type="url"
                        value={formData.linkedInUrl}
                        onChange={handleChange}
                        placeholder={t("common.linkedinPlaceholder")}
                        className={inputClass("linkedInUrl")}
                      />
                      {fieldErrors.linkedInUrl && (
                        <p className={helperTextClass}>{fieldErrors.linkedInUrl}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expertise" className="text-slate-700 dark:text-slate-200">
                      {t("authMentorregisterpage.areaOfExpertise")}{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="expertise"
                      name="expertise"
                      value={formData.expertise}
                      onChange={handleChange}
                      placeholder={t("authMentorregisterpage.exampleExpertise")}
                      className={cn(inputClass("expertise"), "min-h-[90px]")}
                      required
                    />
                    {fieldErrors.expertise && (
                      <p className={helperTextClass}>{fieldErrors.expertise}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-700 dark:text-slate-200">
                      {t("common.introduceYourself")}
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder={t("authMentorregisterpage.writeBriefIntro")}
                      className={cn(inputClass("bio"), "min-h-[110px]")}
                    />
                    {fieldErrors.bio && <p className={helperTextClass}>{fieldErrors.bio}</p>}
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t("common.avatar")}
                      </Label>
                      <UniversalMediaUploader
                        preset="single-image"
                        initialFiles={
                          avatarFile
                            ? [
                                {
                                  name: avatarFile.name,
                                  src: URL.createObjectURL(avatarFile),
                                  type: avatarFile.type,
                                },
                              ]
                            : undefined
                        }
                        onFilesChange={(files) => {
                          setAvatarFile(files[0] || null);
                          clearFieldError("avatarFile");
                        }}
                        triggerClassName={
                          fieldErrors.avatarFile
                            ? "border-red-500 hover:border-red-600 focus-visible:ring-red-500"
                            : ""
                        }
                      />
                      {fieldErrors.avatarFile && (
                        <p className={helperTextClass}>{fieldErrors.avatarFile}</p>
                      )}
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={handleCancel}>
                    {t("general.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#0047AB] text-white hover:bg-[#003A8C] dark:bg-[#005FD1] dark:hover:bg-[#4A90FF]"
                    disabled={isLoading}>
                    {isLoading
                      ? t("authMentorregisterpage.submittingRegistration")
                      : t("authMentorregisterpage.submitRegistration")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
