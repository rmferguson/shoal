import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextStartAt } from "../../tools/pagination.js";

beforeEach(() => vi.restoreAllMocks());

describe("nextStartAt — more pages remain", () => {
  it("returns startAt + returned when the combined offset is still less than total", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: (0 + 25) < 100 → next page starts at 25
    expect(nextStartAt(0, 25, 100)).toBe(25);
  });

  it("returns the correct mid-pagination offset on an intermediate page", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: (50 + 25) < 100 → next page starts at 75
    expect(nextStartAt(50, 25, 100)).toBe(75);
  });
});

describe("nextStartAt — no more pages (returns null)", () => {
  it("returns null when startAt + returned equals total exactly", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: (75 + 25) === 100 → not strictly less than, so null
    expect(nextStartAt(75, 25, 100)).toBeNull();
  });

  it("returns null when startAt + returned exceeds total", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: (95 + 10) > 100 → past end, returns null
    expect(nextStartAt(95, 10, 100)).toBeNull();
  });

  it("returns null when total is zero", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: (0 + 0) === 0 → not strictly less than, so null
    expect(nextStartAt(0, 0, 0)).toBeNull();
  });
});

describe("nextStartAt — edge: zero items returned from a non-empty result set", () => {
  it("returns startAt (i.e. 0) when returned is zero but total is positive", () => {
    // Source: discovered during implementation, no prior spec
    // Behavior: (0 + 0) < 10 → true → returns 0; caller is responsible for avoiding infinite loops
    expect(nextStartAt(0, 0, 10)).toBe(0);
  });
});
