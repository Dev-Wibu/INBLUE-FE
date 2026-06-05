import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
/**
 * Major (Chuyên ngành) constants for the application
 * Used across the entire project to ensure consistency
 */

export interface MajorOption {
  value: string;
  label: string;
  description?: string;
}

export type MajorValue = "CNTT" | "Marketing";

/** Hardcoded major values for validation (no translation needed) */
const MAJOR_VALUES = ["CNTT", "Marketing"] as const;

/**
 * Hook: returns major options with live-translated labels.
 * Use this in React components for correct language switching.
 */
export function useMajorOptions(): MajorOption[] {
  const { t } = useTranslation();
  return buildMajorOptions(t);
}

/**
 * Build major options with the given translation function.
 */
function buildMajorOptions(t: TFunction): MajorOption[] {
  return [
    {
      value: "CNTT",
      label: t("general.informationTechnology"),
      description: t("general.computerScienceSoftwareInformationSystems"),
    },
    {
      value: "Marketing",
      label: t("general.marketing"),
      description: t("general.marketingAdvertisingCommunications"),
    },
  ];
}

/**
 * Get major label by value.
 * Pass `t` from useTranslation() for correct live translations.
 */
export const getMajorLabel = (value: string, t: TFunction): string => {
  const options = buildMajorOptions(t);
  const major = options.find((option) => option.value === value);
  return major?.label || "";
};

/**
 * Get major description by value.
 * Pass `t` from useTranslation() for correct live translations.
 */
export const getMajorDescription = (value: string, t: TFunction): string => {
  const options = buildMajorOptions(t);
  const major = options.find((option) => option.value === value);
  return major?.description || "";
};

/**
 * Validate if a major value is valid
 * @param value - The major value to validate
 * @returns true if valid, false otherwise
 */
export const isValidMajor = (value: string): boolean => {
  return MAJOR_VALUES.includes(value as MajorValue);
};

/**
 * Normalize dynamic major input to backend-supported enum values.
 */
export const normalizeMajor = (value?: string | null): MajorValue | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  return isValidMajor(trimmed) ? (trimmed as MajorValue) : undefined;
};
