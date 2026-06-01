import i18n from "@/lib/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionHistoryTab } from "./TransactionHistoryTab";
const t = i18n.t.bind(i18n);
describe("TransactionHistoryTab", () => {
  it("shows purpose badge for classified payment purpose", () => {
    render(
      <TransactionHistoryTab
        isLoading={false}
        transactions={[
          {
            id: 1,
            amount: 35000,
            transactionCode: "TX-1",
            createdAt: "2026-04-18T03:00:00",
            paymentPurpose: "BUY_MEMBERSHIP",
            description: t("userAccount.payForMembershipPackages"),
          } as never,
        ]}
      />
    );
    expect(screen.getByText(t("common.buyPackages"))).toBeInTheDocument();
    expect(screen.getByText(t("general.completed"))).toBeInTheDocument();
  });
  it("does not show purpose badge when purpose is unknown", () => {
    render(
      <TransactionHistoryTab
        isLoading={false}
        transactions={[
          {
            id: 2,
            amount: 15000,
            transactionCode: "TX-2",
            createdAt: "2026-04-18T03:10:00",
            paymentPurpose: undefined,
            description: "",
            currentBalance: 100000,
          } as never,
        ]}
      />
    );
    expect(screen.queryByText(t("common.uncategorized"))).not.toBeInTheDocument();
  });
});
