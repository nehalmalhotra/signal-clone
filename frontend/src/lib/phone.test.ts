import { describe, expect, it } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("strips formatting and prefixes the calling code", () => {
    expect(toE164("1", "(555) 010-0")).toBe("+15550100");
  });

  it("rejects numbers that are too short", () => {
    expect(toE164("1", "55")).toBeNull();
  });
});
