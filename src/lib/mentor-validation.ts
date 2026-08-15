export const MENTOR_FIELD_LIMITS = {
  name: 100,
  email: 254,
  password: 72,
  bio: 255,
  expertise: 255,
  currentCompany: 255,
  linkedInUrl: 255,
} as const;

export type MentorValidationField =
  | keyof typeof MENTOR_FIELD_LIMITS
  | "yearsOfExperience"
  | "pricePerMinute";

export interface MentorValidationIssue {
  field: MentorValidationField;
  messageKey: string;
  values?: Record<string, string | number>;
}

interface MentorValidationData {
  name?: string;
  email?: string;
  password?: string;
  bio?: string;
  expertise?: string;
  currentCompany?: string;
  linkedInUrl?: string;
  yearsOfExperience?: number;
  pricePerMinute?: number;
}

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export function validateMentorData(
  data: MentorValidationData,
  options: { requirePassword: boolean }
): MentorValidationIssue[] {
  const issues: MentorValidationIssue[] = [];
  const name = data.name?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  const password = data.password ?? "";

  if (!name) {
    issues.push({ field: "name", messageKey: "adminMentormanagement.validation.nameRequired" });
  } else if (name.length > MENTOR_FIELD_LIMITS.name) {
    issues.push({
      field: "name",
      messageKey: "adminMentormanagement.validation.maxLength",
      values: { max: MENTOR_FIELD_LIMITS.name },
    });
  }

  if (!email) {
    issues.push({ field: "email", messageKey: "adminMentormanagement.validation.emailRequired" });
  } else if (email.length > MENTOR_FIELD_LIMITS.email) {
    issues.push({
      field: "email",
      messageKey: "adminMentormanagement.validation.maxLength",
      values: { max: MENTOR_FIELD_LIMITS.email },
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push({ field: "email", messageKey: "adminMentormanagement.validation.emailInvalid" });
  }

  if (options.requirePassword && !password) {
    issues.push({
      field: "password",
      messageKey: "adminMentormanagement.validation.passwordRequired",
    });
  } else if (password && password.length < 8) {
    issues.push({
      field: "password",
      messageKey: "adminMentormanagement.validation.passwordMinLength",
    });
  } else if (password.length > MENTOR_FIELD_LIMITS.password) {
    issues.push({
      field: "password",
      messageKey: "adminMentormanagement.validation.maxLength",
      values: { max: MENTOR_FIELD_LIMITS.password },
    });
  }

  (["bio", "expertise", "currentCompany", "linkedInUrl"] as const).forEach((field) => {
    const value = data[field]?.trim() ?? "";
    if (value.length > MENTOR_FIELD_LIMITS[field]) {
      issues.push({
        field,
        messageKey: "adminMentormanagement.validation.maxLength",
        values: { max: MENTOR_FIELD_LIMITS[field] },
      });
    }
  });

  if (data.linkedInUrl?.trim() && !isHttpUrl(data.linkedInUrl.trim())) {
    issues.push({
      field: "linkedInUrl",
      messageKey: "adminMentormanagement.validation.urlInvalid",
    });
  }

  if (
    data.yearsOfExperience !== undefined &&
    (!Number.isInteger(data.yearsOfExperience) ||
      data.yearsOfExperience < 0 ||
      data.yearsOfExperience > 80)
  ) {
    issues.push({
      field: "yearsOfExperience",
      messageKey: "adminMentormanagement.validation.experienceRange",
    });
  }

  if (
    data.pricePerMinute !== undefined &&
    (!Number.isFinite(data.pricePerMinute) ||
      data.pricePerMinute < 0 ||
      data.pricePerMinute > 100_000_000)
  ) {
    issues.push({
      field: "pricePerMinute",
      messageKey: "adminMentormanagement.validation.priceRange",
    });
  }

  return issues;
}
