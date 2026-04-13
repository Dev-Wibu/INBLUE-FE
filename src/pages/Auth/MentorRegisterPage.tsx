import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  FileText,
  UploadCloud,
  User,
} from "lucide-react";
import { useCallback, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { Link, useNavigate } from "react-router-dom";

import { Footer, Header } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { authManager } from "@/services/auth.manager";

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

type MentorFieldKey =
  | keyof MentorFormData
  | "avatarFile"
  | "identityFile"
  | "degreeFile"
  | "otherFile";

interface FileUploadProps {
  label: string;
  required?: boolean;
  acceptedTypes: string;
  maxSize: string;
  icon: React.ReactNode;
  onFileSelect: (_file: File | null) => void;
  selectedFile: File | null;
  accept?: Record<string, string[]>;
  maxSizeBytes?: number;
  errorText?: string;
  onClearError?: () => void;
}

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
  identityfile: "identityFile",
  degreefile: "degreeFile",
  otherfile: "otherFile",
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

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
};

function FileUploadBox({
  label,
  required,
  acceptedTypes,
  maxSize,
  icon,
  onFileSelect,
  selectedFile,
  accept,
  maxSizeBytes = 5 * 1024 * 1024,
  errorText,
  onClearError,
}: FileUploadProps) {
  const [dropError, setDropError] = useState("");

  const onDropAccepted = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        return;
      }

      setDropError("");
      onClearError?.();
      onFileSelect(acceptedFiles[0]);
    },
    [onClearError, onFileSelect]
  );

  const onDropRejected = useCallback(
    (fileRejections: readonly FileRejection[]) => {
      const firstErrorCode = fileRejections[0]?.errors[0]?.code;

      if (firstErrorCode === "file-too-large") {
        setDropError(`Tệp vượt quá ${maxSize}. Vui lòng chọn tệp nhỏ hơn.`);
        return;
      }

      if (firstErrorCode === "file-invalid-type") {
        setDropError(`Định dạng không hợp lệ. Chỉ hỗ trợ ${acceptedTypes}.`);
        return;
      }

      setDropError("Không thể tải tệp này. Vui lòng thử tệp khác.");
    },
    [acceptedTypes, maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted,
    onDropRejected,
    multiple: false,
    accept,
    maxSize: maxSizeBytes,
  });

  const activeError = errorText || dropError;

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "group flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all",
          "bg-white/80 hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-900",
          activeError
            ? "border-red-300 hover:border-red-400 dark:border-red-700 dark:hover:border-red-600"
            : isDragActive
              ? "border-[#0047AB] bg-[#0047AB]/10 dark:border-[#66B2FF] dark:bg-[#66B2FF]/15"
              : "border-slate-300 hover:border-[#0047AB]/60 dark:border-slate-700 dark:hover:border-[#66B2FF]/70"
        )}>
        <input {...getInputProps()} />

        {selectedFile ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
            <p className="mt-1 line-clamp-1 text-xs font-medium text-[#0047AB] dark:text-[#66B2FF]">
              {selectedFile.name}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatFileSize(selectedFile.size)} • Nhấn để thay đổi tệp
            </p>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {icon}
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {label} {required && <span className="text-red-500">*</span>}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kéo thả tệp vào đây hoặc nhấn để chọn
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0047AB]/10 px-3 py-1 text-xs font-medium text-[#0047AB] dark:bg-[#0047AB]/20 dark:text-[#66B2FF]">
              <UploadCloud className="h-3.5 w-3.5" />
              {acceptedTypes} • Tối đa {maxSize}
            </div>
          </>
        )}
      </div>

      {activeError && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {activeError}
        </p>
      )}
    </div>
  );
}

export function MentorRegisterPage() {
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
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [otherFile, setOtherFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MentorFieldKey, string>>>({});

  const clearFieldError = useCallback((field: MentorFieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
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

    if (!formData.name.trim()) clientFieldErrors.name = "Vui lòng nhập họ và tên.";
    if (!formData.email.trim()) clientFieldErrors.email = "Vui lòng nhập email.";
    if (!formData.password.trim()) clientFieldErrors.password = "Vui lòng nhập mật khẩu.";
    if (!formData.confirmPassword.trim()) {
      clientFieldErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    }
    if (!formData.currentCompany.trim()) {
      clientFieldErrors.currentCompany = "Vui lòng nhập công ty hiện tại.";
    }
    if (!formData.expertise.trim()) {
      clientFieldErrors.expertise = "Vui lòng nhập lĩnh vực chuyên môn.";
    }

    const yearsOfExperience = formData.yearsOfExperience ? Number(formData.yearsOfExperience) : 0;
    if (Number.isNaN(yearsOfExperience) || yearsOfExperience < 0) {
      clientFieldErrors.yearsOfExperience = "Số năm kinh nghiệm phải là số không âm.";
    }

    if (formData.password !== formData.confirmPassword) {
      clientFieldErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    if (Object.keys(clientFieldErrors).length > 0) {
      setFieldErrors(clientFieldErrors);
      setError("Vui lòng kiểm tra lại thông tin bắt buộc trước khi gửi.");
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
        identityFile: identityFile ?? undefined,
        degreeFile: degreeFile ?? undefined,
        otherFile: otherFile ?? undefined,
      });

      if (result.success) {
        navigate("/waiting-accept");
        return;
      }

      const normalizedFieldErrors = normalizeFieldErrors(result.fieldErrors);
      if (Object.keys(normalizedFieldErrors).length > 0) {
        setFieldErrors(normalizedFieldErrors);
      }

      setError(result.error || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin và thử lại.");
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
            Quay lại
          </Link>

          <Card className="border-slate-200/80 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/40">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl text-slate-900 dark:text-white">
                Đăng ký trở thành Mentor
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                Cung cấp thông tin chuyên môn và giấy tờ xác minh để đội ngũ xét duyệt nhanh hơn.
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
                    Thông tin tài khoản
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 dark:text-slate-200">
                        Họ và tên <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
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
                        placeholder="example@email.com"
                        className={inputClass("email")}
                        required
                      />
                      {fieldErrors.email && <p className={helperTextClass}>{fieldErrors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">
                        Mật khẩu <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Nhập mật khẩu"
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
                        Xác nhận mật khẩu <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Nhập lại mật khẩu"
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
                    Thông tin nghề nghiệp
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="currentCompany"
                        className="text-slate-700 dark:text-slate-200">
                        Công ty hiện tại <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="currentCompany"
                        name="currentCompany"
                        value={formData.currentCompany}
                        onChange={handleChange}
                        placeholder="Tên công ty hiện tại"
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
                        Số năm kinh nghiệm <span className="text-red-500">*</span>
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
                        Hồ sơ LinkedIn
                      </Label>
                      <Input
                        id="linkedInUrl"
                        name="linkedInUrl"
                        type="url"
                        value={formData.linkedInUrl}
                        onChange={handleChange}
                        placeholder="https://www.linkedin.com/in/ho-so-cua-ban"
                        className={inputClass("linkedInUrl")}
                      />
                      {fieldErrors.linkedInUrl && (
                        <p className={helperTextClass}>{fieldErrors.linkedInUrl}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expertise" className="text-slate-700 dark:text-slate-200">
                      Lĩnh vực chuyên môn <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="expertise"
                      name="expertise"
                      value={formData.expertise}
                      onChange={handleChange}
                      placeholder="Ví dụ: AI, Học máy, Python, Khoa học dữ liệu..."
                      className={cn(inputClass("expertise"), "min-h-[90px]")}
                      required
                    />
                    {fieldErrors.expertise && (
                      <p className={helperTextClass}>{fieldErrors.expertise}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-slate-700 dark:text-slate-200">
                      Giới thiệu bản thân
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Viết vài dòng giới thiệu về kinh nghiệm và phong cách cố vấn của bạn..."
                      className={cn(inputClass("bio"), "min-h-[110px]")}
                    />
                    {fieldErrors.bio && <p className={helperTextClass}>{fieldErrors.bio}</p>}
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Giấy tờ chứng minh
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Tải lên giấy tờ giúp đội ngũ xác minh danh tính và năng lực của bạn.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FileUploadBox
                      label="Ảnh đại diện"
                      acceptedTypes="JPG, PNG"
                      maxSize="5MB"
                      icon={<User className="h-5 w-5" />}
                      onFileSelect={(file) => {
                        setAvatarFile(file);
                        clearFieldError("avatarFile");
                      }}
                      selectedFile={avatarFile}
                      accept={{
                        "image/jpeg": [".jpg", ".jpeg"],
                        "image/png": [".png"],
                      }}
                      maxSizeBytes={5 * 1024 * 1024}
                      errorText={fieldErrors.avatarFile}
                      onClearError={() => clearFieldError("avatarFile")}
                    />

                    <FileUploadBox
                      label="CCCD/CMND"
                      acceptedTypes="JPG, PNG, PDF"
                      maxSize="5MB"
                      icon={<FileText className="h-5 w-5" />}
                      onFileSelect={(file) => {
                        setIdentityFile(file);
                        clearFieldError("identityFile");
                      }}
                      selectedFile={identityFile}
                      accept={{
                        "application/pdf": [".pdf"],
                        "image/jpeg": [".jpg", ".jpeg"],
                        "image/png": [".png"],
                      }}
                      maxSizeBytes={5 * 1024 * 1024}
                      errorText={fieldErrors.identityFile}
                      onClearError={() => clearFieldError("identityFile")}
                    />

                    <FileUploadBox
                      label="Bằng cấp/Chứng chỉ"
                      acceptedTypes="PDF, JPG, PNG"
                      maxSize="5MB"
                      icon={<Award className="h-5 w-5" />}
                      onFileSelect={(file) => {
                        setDegreeFile(file);
                        clearFieldError("degreeFile");
                      }}
                      selectedFile={degreeFile}
                      accept={{
                        "application/pdf": [".pdf"],
                        "image/jpeg": [".jpg", ".jpeg"],
                        "image/png": [".png"],
                      }}
                      maxSizeBytes={5 * 1024 * 1024}
                      errorText={fieldErrors.degreeFile}
                      onClearError={() => clearFieldError("degreeFile")}
                    />

                    <FileUploadBox
                      label="Tài liệu khác"
                      acceptedTypes="PDF, JPG, PNG"
                      maxSize="5MB"
                      icon={<FileText className="h-5 w-5" />}
                      onFileSelect={(file) => {
                        setOtherFile(file);
                        clearFieldError("otherFile");
                      }}
                      selectedFile={otherFile}
                      accept={{
                        "application/pdf": [".pdf"],
                        "image/jpeg": [".jpg", ".jpeg"],
                        "image/png": [".png"],
                      }}
                      maxSizeBytes={5 * 1024 * 1024}
                      errorText={fieldErrors.otherFile}
                      onClearError={() => clearFieldError("otherFile")}
                    />
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={handleCancel}>
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#0047AB] text-white hover:bg-[#003A8C] dark:bg-[#005FD1] dark:hover:bg-[#4A90FF]"
                    disabled={isLoading}>
                    {isLoading ? "Đang gửi đăng ký..." : "Gửi đăng ký"}
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
