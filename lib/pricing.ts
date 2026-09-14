/**
 * Shared pure pricing/quantity helpers. Used on the storefront (product
 * cards, product page) for display, and on the server
 * (netlify/functions/create-order.js) to validate incoming order requests —
 * kept here, not duplicated, so both sides agree on the same rules.
 */

/**
 * Percentage discount off the original price, rounded to the nearest
 * whole percent. Returns 0 for a missing/non-positive original price
 * instead of producing NaN or Infinity.
 */
export function calculateDiscountPercent(originalPrice: number, price: number): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/** Line total for a given unit price and quantity. */
export function calculateOrderTotal(price: number, quantity: number): number {
  return price * quantity;
}

export const MAX_ORDER_QUANTITY = 20;

/**
 * True when quantity is a whole number between 1 and max (inclusive).
 * Used to reject spam/typo'd quantities on both the client form and the
 * server-side order function.
 */
export function isValidQuantity(quantity: number, max: number = MAX_ORDER_QUANTITY): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= max;
}
