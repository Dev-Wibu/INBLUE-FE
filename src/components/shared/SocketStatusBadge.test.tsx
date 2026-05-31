import i18n from "@/lib/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
const t = i18n.t.bind(i18n);

import { SocketStatusBadge } from "./SocketStatusBadge";

describe("SocketStatusBadge", () => {
  it("renders connecting state label", () => {
    render(<SocketStatusBadge state="connecting" />);
    expect(screen.getByText(t("compShared.connecting"))).toBeInTheDocument();
  });

  it("renders connected state label", () => {
    render(<SocketStatusBadge state="connected" />);
    expect(screen.getByText(t("compShared.stableConnection"))).toBeInTheDocument();
  });

  it("renders disconnected state label", () => {
    render(<SocketStatusBadge state="disconnected" />);
    expect(screen.getByText(t("compShared.lostConnection"))).toBeInTheDocument();
  });
});
