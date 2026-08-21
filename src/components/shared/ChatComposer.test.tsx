import i18n from "@/lib/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const t = i18n.t.bind(i18n);

import { ChatComposer } from "./ChatComposer";

describe("ChatComposer", () => {
  it(t("compShared.sendMessageWhenPressingEnter"), () => {
    const onSend = vi.fn();

    render(
      <ChatComposer
        value="Tin nhan"
        onChange={vi.fn()}
        onSend={onSend}
        placeholder="Nhap tin nhan"
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("khong gui tin khi nhan Shift+Enter", () => {
    const onSend = vi.fn();

    render(
      <ChatComposer
        value="Tin nhan"
        onChange={vi.fn()}
        onSend={onSend}
        placeholder="Nhap tin nhan"
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("khong gui tin khi nhan Enter o mobile", () => {
    const onSend = vi.fn();

    render(
      <ChatComposer
        value="Tin nhan"
        onChange={vi.fn()}
        onSend={onSend}
        placeholder="Nhap tin nhan"
        isMobile
      />
    );

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("hien lenh nhanh va ap dung template", () => {
    const onChange = vi.fn();
    const onApplyQuickCommand = vi.fn();

    render(
      <ChatComposer
        value="/ca"
        onChange={onChange}
        onSend={vi.fn()}
        placeholder="Nhap tin nhan"
        onApplyQuickCommand={onApplyQuickCommand}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /\/camon/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.stringContaining(t("compShared.thankYouIHaveReceived"))
    );
    expect(onApplyQuickCommand).toHaveBeenCalledWith("/camon");
  });

  it("uses theme surfaces for the composer controls", () => {
    render(
      <ChatComposer
        value="Tin nhan"
        onChange={vi.fn()}
        onSend={vi.fn()}
        placeholder="Nhap tin nhan"
      />
    );

    expect(screen.getByRole("textbox")).toHaveClass(
      "border-slate-200/80",
      "bg-white",
      "dark:bg-white/[0.045]"
    );
    expect(screen.getByRole("button", { name: t("compShared.sendAMessage") })).toHaveClass(
      "bg-indigo-600",
      "dark:bg-indigo-500"
    );
  });
});
