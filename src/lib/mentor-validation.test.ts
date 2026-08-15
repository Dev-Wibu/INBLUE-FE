import { describe, expect, it } from "vitest";
import { validateMentorData } from "./mentor-validation";

describe("validateMentorData", () => {
  it("accepts a valid mentor create payload", () => {
    expect(
      validateMentorData(
        {
          name: "Nguyen Van An",
          email: "an@example.com",
          password: "Password123!",
          linkedInUrl: "https://www.linkedin.com/in/an",
          yearsOfExperience: 5,
          pricePerMinute: 5000,
        },
        { requirePassword: true }
      )
    ).toEqual([]);
  });

  it("rejects overlong varchar fields before they reach the API", () => {
    const issues = validateMentorData(
      {
        name: "Valid name",
        email: "mentor@example.com",
        password: "Password123!",
        bio: "a".repeat(256),
      },
      { requirePassword: true }
    );

    expect(issues).toContainEqual(expect.objectContaining({ field: "bio", values: { max: 255 } }));
  });

  it("requires a password only when creating a mentor", () => {
    const data = { name: "Mentor", email: "mentor@example.com" };

    expect(validateMentorData(data, { requirePassword: true })).toContainEqual(
      expect.objectContaining({ field: "password" })
    );
    expect(validateMentorData(data, { requirePassword: false })).toEqual([]);
  });
});
