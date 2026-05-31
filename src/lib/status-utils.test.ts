import i18n from "@/lib/i18n";
import { getTransactionPurposeBadge } from "@/lib/status-utils";
import { describe, expect, it } from "vitest";
const t = i18n.t.bind(i18n);
describe("getTransactionPurposeBadge", () => {
  it("returns expected badge for membership purpose", () => {
    const badge = getTransactionPurposeBadge("BUY_MEMBERSHIP");
    expect(badge.label).toBe(t("common.buyPackages"));
    expect(badge.variant).toBe("default");
  });
  it("returns expected badge for mentor interview purpose", () => {
    const badge = getTransactionPurposeBadge("MENTOR_INTERVIEW");
    expect(badge.label).toBe(t("general.mentorSession"));
    expect(badge.variant).toBe("default");
  });
  it("returns fallback badge for unknown purpose", () => {
    const badge = getTransactionPurposeBadge("UNKNOWN");
    expect(badge.label).toBe(t("common.uncategorized"));
    expect(badge.variant).toBe("outline");
  });
});
