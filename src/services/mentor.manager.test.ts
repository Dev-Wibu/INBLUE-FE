import i18n from "@/lib/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";
const t = i18n.t.bind(i18n);

vi.mock("@/lib/api", () => ({
  fetchClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
  },
}));

import { fetchClient } from "@/lib/api";
import { mentorManager } from "./mentor.manager";

const mockGet = fetchClient.GET as ReturnType<typeof vi.fn>;
const mockPost = fetchClient.POST as ReturnType<typeof vi.fn>;
const mockPut = fetchClient.PUT as ReturnType<typeof vi.fn>;

async function readLastUpdatePayload(): Promise<Record<string, unknown>> {
  const request = mockPut.mock.calls.at(-1)?.[1] as { body?: FormData } | undefined;
  const dataPart = request?.body?.get("data");
  if (!(dataPart instanceof Blob)) {
    throw new Error("Expected mentor update payload to contain a JSON Blob");
  }
  const json = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(dataPart);
  });
  return JSON.parse(json) as Record<string, unknown>;
}

describe("MentorManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns mentors on success", async () => {
      const mentors = [{ id: 1, name: "Mentor A" }];
      mockGet.mockResolvedValueOnce({ data: mentors, error: null });

      const result = await mentorManager.getAll();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mentors);
    });

    it("returns error on failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network error"));

      const result = await mentorManager.getAll();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("normalizes the backend isActive alias used by some mentor responses", async () => {
      mockGet.mockResolvedValueOnce({ data: [{ id: 3, name: "Mentor", isActive: false }] });

      const result = await mentorManager.getAll();

      expect(Array.isArray(result.data) && result.data[0]?.active).toBe(false);
    });
  });

  describe("getById", () => {
    it("returns a mentor by id", async () => {
      const mentor = { id: 1, name: "Mentor A" };
      mockGet.mockResolvedValueOnce({ data: mentor, error: null });

      const result = await mentorManager.getById(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mentor);
    });

    it("returns error on failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Not found"));

      const result = await mentorManager.getById(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not found");
    });
  });

  describe("findByEmail", () => {
    it("returns the mentor whose email matches (case-insensitive)", async () => {
      const list = [
        { id: 7, name: "A", email: "Other@Test.com" },
        { id: 11, name: "B", email: "tuan94868@gmail.com" },
      ];
      mockGet.mockResolvedValueOnce({ data: list });

      const mentor = await mentorManager.findByEmail("Tuan94868@GMAIL.com");

      expect(mentor).toEqual({ id: 11, name: "B", email: "tuan94868@gmail.com" });
    });

    it("unwraps paginated responses (data.items)", async () => {
      const list = { items: [{ id: 5, email: "x@y.com" }], total: 1 };
      mockGet.mockResolvedValueOnce({ data: list });

      const mentor = await mentorManager.findByEmail("x@y.com");

      expect(mentor).toEqual({ id: 5, email: "x@y.com" });
    });

    it("unwraps paginated responses that use a data collection", async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [{ id: 6, email: "data@y.com" }], total: 1 } });

      const mentor = await mentorManager.findByEmail("data@y.com");

      expect(mentor).toEqual({ id: 6, email: "data@y.com" });
    });

    it("returns null when no mentor matches the email", async () => {
      mockGet.mockResolvedValueOnce({ data: [{ id: 1, email: "a@b.com" }] });

      const mentor = await mentorManager.findByEmail("missing@example.com");

      expect(mentor).toBeNull();
    });

    it("returns null when the underlying getAll fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network down"));

      const mentor = await mentorManager.findByEmail("x@y.com");

      expect(mentor).toBeNull();
    });

    it("returns null for empty input without calling the API", async () => {
      expect(await mentorManager.findByEmail("")).toBeNull();
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("toggleActive", () => {
    it("calls toggle endpoint and returns updated mentor", async () => {
      const mentor = { id: 1, active: false };
      mockGet.mockResolvedValueOnce({ data: mentor, error: null });

      const result = await mentorManager.toggleActive(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mentor);
      expect(mockGet).toHaveBeenCalledTimes(1);
      // Verify it calls the toggle endpoint (not getById)
      const calledUrl = mockGet.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain("toggle");
    });

    it("returns error on failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Toggle failed"));

      const result = await mentorManager.toggleActive(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Toggle failed");
    });
  });

  describe("create", () => {
    it("creates a mentor with FormData", async () => {
      const created = { id: 2, name: "New Mentor" };
      mockPost.mockResolvedValueOnce({ data: created, error: null });

      const result = await mentorManager.create({
        name: "New Mentor",
        email: "new@test.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(created);
      expect(mockPost).toHaveBeenCalledWith(
        "/api/mentors",
        expect.objectContaining({ body: expect.any(FormData) })
      );
    });

    it("returns error when name is missing", async () => {
      const result = await mentorManager.create({
        email: "test@test.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("adminMentormanagement.validation.nameRequired"));
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("returns error when name is empty string", async () => {
      const result = await mentorManager.create({
        name: "  ",
        email: "test@test.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("adminMentormanagement.validation.nameRequired"));
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("returns error when email is missing", async () => {
      const result = await mentorManager.create({ name: "Mentor", password: "password123" });

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("adminMentormanagement.validation.emailRequired"));
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("returns error when email is empty string", async () => {
      const result = await mentorManager.create({
        name: "Mentor",
        email: "  ",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("adminMentormanagement.validation.emailRequired"));
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("returns error on POST failure", async () => {
      mockPost.mockRejectedValueOnce(new Error("Create failed"));

      const result = await mentorManager.create({
        name: "M",
        email: "m@test.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Create failed");
    });
  });

  describe("update", () => {
    it("fetches existing mentor and merges data into FormData", async () => {
      const existing = {
        id: 1,
        name: "Old",
        email: "old@test.com",
        password: "hashed",
        active: true,
      };
      mockGet.mockResolvedValueOnce({ data: existing });
      mockPut.mockResolvedValueOnce({ data: { id: 1, name: "New" } });

      const result = await mentorManager.update(1, { name: "New" });

      expect(result.success).toBe(true);
      expect(mockGet).toHaveBeenCalledTimes(1); // getById
      expect(mockPut).toHaveBeenCalledWith(
        "/api/mentors/1",
        expect.objectContaining({ body: expect.any(FormData) })
      );
    });

    it("preserves the existing password hash when BE returns one", async () => {
      // The BE wipes the mentor's password whenever `password` is missing
      // from the update payload. To avoid that we re-send whatever the
      // GET endpoint returned.
      const existing = { id: 1, name: "M", email: "e@t.com", password: "$2a$10$hash" };
      mockGet.mockResolvedValueOnce({ data: existing });
      mockPut.mockResolvedValueOnce({ data: { id: 1 } });

      await mentorManager.update(1, { name: "Updated" });

      expect(mockPut).toHaveBeenCalledTimes(1);

      const parsed = await readLastUpdatePayload();
      expect(parsed.password).toBe("$2a$10$hash");
      expect(parsed.name).toBe("Updated");
    });

    it("does NOT send password field when existing record has none", async () => {
      // Some BE responses strip the password entirely. In that case the
      // payload must not invent one — we have nothing safe to send.
      const existing = { id: 1, name: "M", email: "e@t.com" };
      mockGet.mockResolvedValueOnce({ data: existing });
      mockPut.mockResolvedValueOnce({ data: { id: 1 } });

      await mentorManager.update(1, { name: "Updated" });

      const parsed = await readLastUpdatePayload();
      expect(parsed).not.toHaveProperty("password");
    });

    it("preserves active field from _data when provided", async () => {
      const existing = { id: 1, name: "M", email: "e@t.com", active: false };
      mockGet.mockResolvedValueOnce({ data: existing });
      mockPut.mockResolvedValueOnce({ data: { id: 1 } });

      await mentorManager.update(1, { name: "M", active: true });

      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it("falls back to existing active when _data.active is not set", async () => {
      const existing = { id: 1, name: "M", email: "e@t.com", active: true };
      mockGet.mockResolvedValueOnce({ data: existing });
      mockPut.mockResolvedValueOnce({ data: { id: 1 } });

      await mentorManager.update(1, { name: "M" });

      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it("proceeds when getById fails (ignores fetch error)", async () => {
      mockGet.mockRejectedValueOnce(new Error("Not found"));
      mockPut.mockResolvedValueOnce({ data: { id: 1 } });

      const result = await mentorManager.update(1, { name: "New", email: "n@t.com" });

      expect(result.success).toBe(true);
      expect(mockPut).toHaveBeenCalledTimes(1);
    });

    it("returns error on PUT failure", async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 1, name: "X", email: "x@test.com" } });
      mockPut.mockRejectedValueOnce(new Error("Update failed"));

      const result = await mentorManager.update(1, { name: "X" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("returns i18n fallback for non-Error throws", async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 1, name: "X", email: "x@test.com" } });
      mockPut.mockRejectedValueOnce("string error");

      const result = await mentorManager.update(1, { name: "X" });

      expect(result.success).toBe(false);
      expect(result.error).toBe(t("common.unableToUpdateMentor"));
    });
  });

  describe("delete", () => {
    it("delegates to toggleActive", async () => {
      mockGet.mockResolvedValueOnce({ data: { id: 1, active: false } });

      const result = await mentorManager.delete(1);

      expect(result.success).toBe(true);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });
});
