import type { UserUsageRecord } from "@/interfaces";
import { describe, expect, it } from "vitest";

import { buildMembershipUsageChartData } from "./membershipUsageChart.utils";

const createUsageRecord = (
  planName: string | null,
  isActive = true,
  hasMembership = true
): UserUsageRecord => ({
  userId: Math.floor(Math.random() * 10_000),
  user: {
    isActive,
    membershipPlan: hasMembership ? { name: planName } : null,
  },
});

const createFlatUsageRecord = (planName: string | null, active = true): UserUsageRecord => ({
  userId: Math.floor(Math.random() * 10_000),
  planName,
  active,
});

describe("buildMembershipUsageChartData", () => {
  it("counts only active users in FREE, NEW, BASIC, PREMIUM", () => {
    const data = buildMembershipUsageChartData([
      createUsageRecord("FREE"),
      createUsageRecord("NEW"),
      createUsageRecord("BASIC"),
      createUsageRecord("PREMIUM"),
      createUsageRecord("PREMIUM"),
      createUsageRecord("FREE", false),
      createUsageRecord("TEST"),
    ]);

    expect(data).toHaveLength(4);
    expect(data.find((item) => item.plan === "FREE")?.value).toBe(1);
    expect(data.find((item) => item.plan === "NEW")?.value).toBe(1);
    expect(data.find((item) => item.plan === "BASIC")?.value).toBe(1);
    expect(data.find((item) => item.plan === "PREMIUM")?.value).toBe(2);

    expect(data.find((item) => item.plan === "FREE")?.percentage).toBeCloseTo(20, 1);
    expect(data.find((item) => item.plan === "NEW")?.percentage).toBeCloseTo(20, 1);
    expect(data.find((item) => item.plan === "BASIC")?.percentage).toBeCloseTo(20, 1);
    expect(data.find((item) => item.plan === "PREMIUM")?.percentage).toBeCloseTo(40, 1);
  });

  it("keeps all tracked plans even when there is no valid record", () => {
    const data = buildMembershipUsageChartData([
      createUsageRecord("TEST"),
      createUsageRecord(null),
      createUsageRecord("PREMIUM", true, false),
      createUsageRecord("FREE", false),
    ]);

    expect(data.map((item) => item.plan)).toEqual(["FREE", "NEW", "BASIC", "PREMIUM"]);
    data.forEach((item) => {
      expect(item.value).toBe(0);
      expect(item.percentage).toBe(0);
    });
  });

  it("normalizes mixed-case plan names", () => {
    const data = buildMembershipUsageChartData([
      createUsageRecord("free"),
      createUsageRecord("new"),
      createUsageRecord("Basic"),
      createUsageRecord("PrEmIuM"),
    ]);

    expect(data.find((item) => item.plan === "FREE")?.value).toBe(1);
    expect(data.find((item) => item.plan === "NEW")?.value).toBe(1);
    expect(data.find((item) => item.plan === "BASIC")?.value).toBe(1);
    expect(data.find((item) => item.plan === "PREMIUM")?.value).toBe(1);
  });

  it("counts flat usage payload with planName and active fields", () => {
    const data = buildMembershipUsageChartData([
      createFlatUsageRecord("FREE", true),
      createFlatUsageRecord("NEW", true),
      createFlatUsageRecord("BASIC", true),
      createFlatUsageRecord("PREMIUM", true),
      createFlatUsageRecord("FREE", false),
    ]);

    expect(data.find((item) => item.plan === "FREE")?.value).toBe(1);
    expect(data.find((item) => item.plan === "NEW")?.value).toBe(1);
    expect(data.find((item) => item.plan === "BASIC")?.value).toBe(1);
    expect(data.find((item) => item.plan === "PREMIUM")?.value).toBe(1);
  });
});
