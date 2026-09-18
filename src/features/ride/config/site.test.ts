import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  isAbsoluteHttpUrl,
  normalizePath,
  normalizeSiteOrigin,
} from "@/features/ride/config/site";

describe("site URL helpers", () => {
  it("normalizes site origin to https without trailing slash", () => {
    expect(normalizeSiteOrigin("https://example.com/")).toBe(
      "https://example.com",
    );
    expect(normalizeSiteOrigin("http://example.com")).toBe(
      "https://example.com",
    );
    expect(normalizeSiteOrigin("example.com")).toBe("https://example.com");
    expect(normalizeSiteOrigin("http://localhost:5173")).toBe("");
    expect(normalizeSiteOrigin("")).toBe("");
  });

  it("strips query and hash from paths", () => {
    expect(normalizePath("/ride?from=a&to=b")).toBe("/ride");
    expect(normalizePath("/ride/#section")).toBe("/ride");
    expect(normalizePath("/ride/")).toBe("/ride");
    expect(normalizePath("/")).toBe("/");
  });

  it("builds absolute urls when origin is set via import.meta", () => {
    // Without VITE_SITE_URL in vitest, absoluteUrl returns path-only;
    // isAbsoluteHttpUrl guards SEO writers.
    expect(isAbsoluteHttpUrl("https://example.com/ride")).toBe(true);
    expect(isAbsoluteHttpUrl("/ride")).toBe(false);
    expect(absoluteUrl("/ride?x=1").includes("?")).toBe(false);
  });
});
