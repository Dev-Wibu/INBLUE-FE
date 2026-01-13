/**
 * Example Unit Test: QuestionCategoryManager
 * This is a sample test to demonstrate Vitest unit testing
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the api.config module to ensure mock mode is used
vi.mock("@/constants/api.config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/constants/api.config")>();
  return {
    ...actual,
    MANAGER_MODE: "mock", // Force mock mode for tests
  };
});

import { QuestionCategoryManager } from "@/services/question-category.manager";

describe("QuestionCategoryManager", () => {
  let manager: QuestionCategoryManager;

  beforeEach(() => {
    manager = new QuestionCategoryManager();
  });

  describe("getAll", () => {
    it("should return all question categories in mock mode", async () => {
      const result = await manager.getAll();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getById", () => {
    it("should return a question category by ID in mock mode", async () => {
      const result = await manager.getById(1);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(1);
    });

    it("should return error for non-existent ID", async () => {
      const result = await manager.getById(999);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("create", () => {
    it("should create a new question category in mock mode", async () => {
      const newCategory = {
        categoryName: "New Category",
        description: "Test description",
      };

      const result = await manager.create(newCategory);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.categoryName).toBe("New Category");
    });
  });

  describe("update", () => {
    it("should update a question category in mock mode", async () => {
      const updateData = {
        categoryName: "Updated Category",
      };

      const result = await manager.update(1, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.categoryName).toBe("Updated Category");
    });
  });

  describe("delete", () => {
    it("should delete a question category in mock mode", async () => {
      const result = await manager.delete(1);

      expect(result.success).toBe(true);
    });
  });
});
