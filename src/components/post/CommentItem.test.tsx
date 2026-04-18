import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatDateTime } from "@/lib/formatting";

import { CommentItem } from "./CommentItem";

describe("CommentItem", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hien thi relative time kem tooltip absolute time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T14:56:00Z"));

    const createdAt = "2026-04-14T14:26:00Z";
    const { container } = render(
      <CommentItem
        comment={{
          id: 1,
          userName: "Nguyen Van A",
          content: "Noi dung binh luan",
          createdAt,
        }}
      />
    );

    expect(screen.getByText("30 phút trước")).toBeInTheDocument();

    const timeElement = container.querySelector(`span[title="${formatDateTime(createdAt)}"]`);
    expect(timeElement).not.toBeNull();
  });

  it("an dong thoi gian khi comment khong co createdAt", () => {
    const { container } = render(
      <CommentItem
        comment={{
          id: 2,
          userName: "Nguyen Van B",
          content: "Binh luan khong co moc thoi gian",
        }}
      />
    );

    expect(screen.queryByText("Vừa xong")).not.toBeInTheDocument();
    expect(container.querySelector("span[title]")).toBeNull();
  });
});
