import { fetchClient } from "@/lib/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usersAdminManager } from "./users-admin.manager";

vi.mock("@/lib/api", () => ({
  fetchClient: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

const mockGet = fetchClient.GET as ReturnType<typeof vi.fn>;
const mockPost = fetchClient.POST as ReturnType<typeof vi.fn>;

async function readLastPayload(): Promise<Record<string, unknown>> {
  const request = mockPost.mock.calls.at(-1)?.[1] as { body?: FormData } | undefined;
  const dataPart = request?.body?.get("data");
  if (!(dataPart instanceof Blob)) throw new Error("Expected a multipart JSON payload");
  const json = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(dataPart);
  });
  return JSON.parse(json) as Record<string, unknown>;
}

describe("UsersAdminManager.toggleActive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads full user details and preserves the password when toggling status", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: 9,
        name: "Candidate",
        email: "candidate@example.com",
        password: "$2a$hashed-password",
        isActive: false,
        university: "FPT",
      },
    });
    mockPost.mockResolvedValueOnce({ data: { id: 9, isActive: true } });

    const result = await usersAdminManager.toggleActive(9, {
      id: 9,
      name: "Candidate",
      email: "candidate@example.com",
      isActive: false,
    });
    const payload = await readLastPayload();

    expect(result.success).toBe(true);
    expect(payload).toMatchObject({
      id: 9,
      password: "$2a$hashed-password",
      isActive: true,
      university: "FPT",
    });
  });

  it("does not send a destructive update when the password is unavailable", async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 9, name: "Candidate", email: "candidate@example.com", isActive: true },
    });

    const result = await usersAdminManager.toggleActive(9, { id: 9, isActive: true });

    expect(result.success).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
