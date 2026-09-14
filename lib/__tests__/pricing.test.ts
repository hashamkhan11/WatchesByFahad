import { describe, it, expect } from "vitest";
import {
  calculateDiscountPercent,
  calculateOrderTotal,
  isValidQuantity,
  MAX_ORDER_QUANTITY,
} from "../pricing";

describe("calculateDiscountPercent", () => {
  it("rounds the percentage off the original price", () => {
    expect(calculateDiscountPercent(5000, 3499)).toBe(30);
  });

  it("returns 0 when there is no discount", () => {
    expect(calculateDiscountPercent(1000, 1000)).toBe(0);
  });

  it("returns 0 for a zero or negative original price instead of NaN/Infinity", () => {
    expect(calculateDiscountPercent(0, 100)).toBe(0);
    expect(calculateDiscountPercent(-50, 100)).toBe(0);
  });

  it("matches the exact catalog figures used on the storefront", () => {
    // PP Single Tone Chain: originalPrice 5000, price 3499 -> 30% off
    expect(calculateDiscountPercent(5000, 3499)).toBe(30);
    // PP Leather Strap: originalPrice 6500, price 4499 -> 31% off
    expect(calculateDiscountPercent(6500, 4499)).toBe(31);
  });
});

describe("calculateOrderTotal", () => {
  it("multiplies unit price by quantity", () => {
    expect(calculateOrderTotal(3499, 2)).toBe(6998);
  });

  it("returns 0 for a zero quantity", () => {
    expect(calculateOrderTotal(3499, 0)).toBe(0);
  });
});

describe("isValidQuantity", () => {
  it("accepts whole numbers within range", () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(MAX_ORDER_QUANTITY)).toBe(true);
  });

  it("rejects zero, negative, and out-of-range quantities", () => {
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(-1)).toBe(false);
    expect(isValidQuantity(MAX_ORDER_QUANTITY + 1)).toBe(false);
  });

  it("rejects non-integer quantities", () => {
    expect(isValidQuantity(1.5)).toBe(false);
    expect(isValidQuantity(NaN)).toBe(false);
  });

  it("respects a custom max", () => {
    expect(isValidQuantity(5, 5)).toBe(true);
    expect(isValidQuantity(6, 5)).toBe(false);
  });
});
