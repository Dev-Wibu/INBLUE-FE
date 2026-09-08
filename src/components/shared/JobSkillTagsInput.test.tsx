import i18n from "@/lib/i18n";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobSkillTagsInput } from "./JobSkillTagsInput";

describe("JobSkillTagsInput", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("vi");
  });

  it("adds a tag with Enter", () => {
    const onChange = vi.fn();
    render(<JobSkillTagsInput value={["Java"]} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Nhập kỹ năng, ví dụ: React");
    fireEvent.change(input, { target: { value: "Spring Boot" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(["Java", "Spring Boot"]);
  });

  it("removes an existing tag", () => {
    const onChange = vi.fn();
    render(<JobSkillTagsInput value={["Java", "SQL"]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Xóa kỹ năng Java" }));

    expect(onChange).toHaveBeenCalledWith(["SQL"]);
  });
});
