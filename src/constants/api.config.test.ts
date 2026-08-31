import { describe, expect, it } from "vitest";

import { isPublicAuthRequest, isSilent401Endpoint } from "./api.config";

describe("post authentication routing", () => {
  it("keeps the published feed public", () => {
    expect(isPublicAuthRequest("https://api.kdz.asia/api/posts/published", "GET")).toBe(true);
  });

  it("keeps numeric public post details public", () => {
    expect(isPublicAuthRequest("https://api.kdz.asia/api/posts/42", "GET")).toBe(true);
    expect(isSilent401Endpoint("https://api.kdz.asia/api/posts/42", "GET")).toBe(true);
  });

  it("requires auth for the personalized home feed", () => {
    expect(isPublicAuthRequest("https://api.kdz.asia/api/posts/feed?page=0&size=3", "GET")).toBe(
      false
    );
    expect(isSilent401Endpoint("https://api.kdz.asia/api/posts/feed", "GET")).toBe(false);
  });

  it("requires auth for post interaction endpoints", () => {
    expect(isPublicAuthRequest("https://api.kdz.asia/api/posts/42/comments", "GET")).toBe(false);
    expect(isPublicAuthRequest("https://api.kdz.asia/api/posts/likes/42/check", "GET")).toBe(false);
  });
});
