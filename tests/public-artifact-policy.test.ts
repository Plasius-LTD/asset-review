import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  isForbiddenRegistryPath,
  normalizeRepositoryPath,
}: {
  isForbiddenRegistryPath: (value: string) => boolean;
  normalizeRepositoryPath: (value: string) => string;
} = require("../scripts/verify-public-package.cjs");

describe("public artifact path policy", () => {
  it("normalizes repository paths without inspecting file contents", () => {
    expect(normalizeRepositoryPath("./LEGAL\\CLA-REGISTRY.CSV")).toBe(
      "legal/cla-registry.csv"
    );
  });

  it("rejects only the administrative contributor registry path", () => {
    expect(isForbiddenRegistryPath("legal/CLA-REGISTRY.csv")).toBe(true);
    expect(isForbiddenRegistryPath("legal/CLA.md")).toBe(false);
    expect(isForbiddenRegistryPath("docs/cla-registry.csv")).toBe(false);
  });
});
