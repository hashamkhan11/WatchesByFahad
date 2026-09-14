import { describe, it, expect } from "vitest";
import { catalog, getGroupById, getVariant } from "../catalog";

describe("getGroupById", () => {
  it("finds a group that exists in the catalog", () => {
    const group = getGroupById("pp-single-tone");
    expect(group).toBeDefined();
    expect(group?.fullName).toBe("PP Single Tone Chain");
  });

  it("returns undefined for an unknown id", () => {
    expect(getGroupById("does-not-exist")).toBeUndefined();
  });

  it("searches across every brand category, not just the first", () => {
    const group = getGroupById("tst-single-tone");
    expect(group).toBeDefined();
    expect(group?.categoryId).toBe("tst");
  });
});

describe("getVariant", () => {
  const group = getGroupById("pp-single-tone")!;

  it("returns the requested variant when it exists", () => {
    const variant = getVariant(group, "ice-blue");
    expect(variant.id).toBe("ice-blue");
  });

  it("falls back to the group's default variant for an unknown id", () => {
    const variant = getVariant(group, "not-a-real-variant");
    expect(variant.id).toBe(group.defaultVariant);
  });

  it("falls back to the first variant if even the default is somehow missing", () => {
    const brokenGroup = { ...group, defaultVariant: "also-not-real" };
    const variant = getVariant(brokenGroup, "also-not-real");
    expect(variant.id).toBe(group.variants[0].id);
  });
});

describe("catalog integrity", () => {
  it("every group has a price and a defaultVariant that actually exists among its variants", () => {
    for (const category of catalog) {
      for (const group of category.groups) {
        expect(group.price).toBeGreaterThan(0);
        expect(group.variants.some((v) => v.id === group.defaultVariant)).toBe(true);
      }
    }
  });
});
