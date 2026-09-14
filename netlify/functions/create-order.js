/**
 * Creates a COD order with the price recomputed server-side from the
 * catalog — the client only ever sends a product/variant id and a
 * quantity, never a price, so a tampered request can't change what
 * actually gets charged. Public endpoint: anyone can place an order,
 * the same as the old client-side Firestore write did.
 */

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getGroupById, getVariant } = require("../../data/catalog");
const { isValidQuantity } = require("../../lib/pricing");

if (!getApps().length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) initializeApp({ credential: cert(JSON.parse(sa)) });
}

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://watchesbyfahad.com";

function badRequest(cors, error) {
  return { statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error }) };
}

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": SITE_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ ok: false, error: "POST required" }) };
  }
  if (!getApps().length) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: "Service unavailable" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return badRequest(cors, "Invalid JSON");
  }

  const { groupId, variantId, name, phone, address, city, quantity, note } = body || {};

  const group = typeof groupId === "string" ? getGroupById(groupId) : undefined;
  if (!group) return badRequest(cors, "Unknown product");
  const variant = getVariant(group, typeof variantId === "string" ? variantId : "");

  const qty = Number.parseInt(quantity, 10);
  if (!isValidQuantity(qty)) {
    return badRequest(cors, "Invalid quantity");
  }

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
  const trimmedAddress = typeof address === "string" ? address.trim() : "";
  const trimmedCity = typeof city === "string" ? city.trim() : "";

  if (!trimmedName || trimmedName.length > 120) return badRequest(cors, "Name is required");
  if (!trimmedPhone || trimmedPhone.length > 25) return badRequest(cors, "Phone is required");
  if (!trimmedAddress || trimmedAddress.length > 500) return badRequest(cors, "Address is required");
  if (!trimmedCity || trimmedCity.length > 80) return badRequest(cors, "City is required");

  // Canonical price — looked up server-side, never trusted from the client.
  const price = group.price;
  const productId = `${group.id}-${variant.id}`;
  const productName = `${group.fullName} — ${variant.name}`;

  try {
    const db = getFirestore();
    const order = {
      name: trimmedName,
      phone: trimmedPhone,
      address: trimmedAddress,
      city: trimmedCity,
      productId,
      productName,
      price,
      quantity: qty,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    };
    if (typeof note === "string" && note.trim()) order.note = note.trim();

    const docRef = await db.collection("orders").add(order);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, orderId: docRef.id, price, productName }),
    };
  } catch (err) {
    console.error("create-order error:", err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: "Failed to create order" }) };
  }
};
