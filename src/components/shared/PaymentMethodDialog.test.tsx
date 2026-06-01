import i18n from "@/lib/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentMethodDialog } from "./PaymentMethodDialog";
const t = i18n.t.bind(i18n);
describe("PaymentMethodDialog", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: t("common.choosePaymentMethod"),
    amount: 35000,
    onConfirm: vi.fn(),
  };
  it(t("compShared.showsSynchronizationStatusWhenThere"), () => {
    render(<PaymentMethodDialog {...baseProps} walletBalance={undefined} />);
    expect(screen.getByText(t("compShared.currentBalanceSyncing"))).toBeInTheDocument();
    expect(screen.getByText(t("compShared.unableToSynchronizeWalletBalance"))).toBeInTheDocument();
    const walletRadio = screen.getByRole("radio", {
      name: new RegExp(t("compShared.payWithWallet"), "i"),
    });
    expect(walletRadio).toBeDisabled();
  });
  it(t("compShared.allowsYouToChooseA"), () => {
    render(<PaymentMethodDialog {...baseProps} walletBalance={150000} defaultMethod="wallet" />);
    const walletRadio = screen.getByRole("radio", {
      name: new RegExp(t("compShared.payWithWallet"), "i"),
    });
    expect(walletRadio).toBeEnabled();
    expect(screen.queryByText(t("compShared.walletBalanceIsNotEnough"))).not.toBeInTheDocument();
  });
  it(t("compShared.blockWalletMethodWhenBalance"), () => {
    render(<PaymentMethodDialog {...baseProps} walletBalance={10000} defaultMethod="wallet" />);
    const walletRadio = screen.getByRole("radio", {
      name: new RegExp(t("compShared.payWithWallet"), "i"),
    });
    expect(walletRadio).toBeDisabled();
    expect(screen.getByText(t("compShared.walletBalanceIsNotEnough"))).toBeInTheDocument();
  });
});
