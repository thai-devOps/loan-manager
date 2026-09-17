import { describe, expect, it } from "vitest";
import {
  getIndexablePaths,
  validateSeoRegistry,
} from "@/features/ride/seo/registry";

describe("ride SEO registry", () => {
  it("has unique paths/titles and required content", () => {
    const issues = validateSeoRegistry().filter((i) => i.level === "error");
    expect(issues).toEqual([]);
  });

  it("exposes indexable paths including home and landings", () => {
    const paths = getIndexablePaths();
    expect(paths).toContain("/ride");
    expect(paths).toContain("/ride/locations/long-xuyen");
    expect(paths).toContain("/ride/routes/an-giang-can-tho");
    expect(paths).toContain("/ride/dua-don-san-bay");
    expect(new Set(paths).size).toBe(paths.length);
  });
});
