/**
 * Test setup file for Vitest
 * This file runs before each test file
 */

import "@testing-library/jest-dom";

if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = class DOMMatrix {} as unknown;
}
