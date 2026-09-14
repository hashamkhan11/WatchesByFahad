// Client-side PostEx helpers — all calls go through the Netlify function proxy,
// which requires a valid admin Firebase ID token on every action.

import { auth } from "@/lib/firebase";

export const POSTEX_STATUS: Record<string, { en: string; ur: string; step: number; color: string }> = {
  "0001": { en: "Order Booked",         ur: "آرڈر بک ہو گیا",           step: 1, color: "blue"   },
  "0002": { en: "Picked Up",            ur: "پک اپ ہو گیا",             step: 2, color: "blue"   },
  "0003": { en: "In Transit",           ur: "راستے میں ہے",              step: 3, color: "amber"  },
  "0004": { en: "Out for Delivery",     ur: "ڈلیوری کے لیے نکل گیا",    step: 4, color: "amber"  },
  "0005": { en: "Delivered",            ur: "ڈلیور ہو گیا",              step: 5, color: "green"  },
  "0006": { en: "Delivery Attempted",   ur: "ڈلیوری کی کوشش کی گئی",    step: 4, color: "orange" },
  "0007": { en: "Returned to Origin",   ur: "واپس کر دیا گیا",           step: 5, color: "red"    },
  "0008": { en: "Cancelled",            ur: "منسوخ کر دیا گیا",          step: 0, color: "red"    },
  "0009": { en: "Return in Transit",    ur: "واپسی راستے میں",           step: 4, color: "purple" },
  "0010": { en: "Return Delivered",     ur: "واپسی مل گئی",              step: 5, color: "purple" },
  "0011": { en: "Partial Delivery",     ur: "جزوی ڈلیوری",               step: 4, color: "orange" },
  "0012": { en: "Misrouted",            ur: "غلط راستہ",                 step: 3, color: "red"    },
  "0013": { en: "Hold",                 ur: "روکا گیا",                  step: 3, color: "gray"   },
};

// Map PostEx status → our internal OrderStatus
export const POSTEX_TO_ORDER_STATUS: Record<string, import("./orders").OrderStatus> = {
  "0001": "confirmed",
  "0002": "dispatched",
  "0003": "in_transit",
  "0004": "in_transit",
  "0005": "delivered",
  "0006": "failed_delivery",
  "0007": "returned",
  "0008": "cancelled",
  "0009": "in_transit",
  "0010": "returned",
  "0011": "delivered",
  "0012": "in_transit",
  "0013": "in_transit",
};

const API = "/.netlify/functions/postex";

async function authHeaders(): Promise<Record<string, string> | null> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) return null;
  return { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };
}

export async function postexBook(order: {
  orderId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  productName: string;
  price: number;
  quantity: number;
}): Promise<{ ok: boolean; trackingNumber?: string; error?: string; raw?: unknown }> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, error: "Not signed in" };
  const res = await fetch(`${API}?action=book`, {
    method: "POST",
    headers,
    body: JSON.stringify(order),
  });
  const json = await res.json();
  const cn = json?.data?.dist?.trackingNumber || json?.data?.trackingNumber;
  return { ok: json.ok && !!cn, trackingNumber: cn, error: json.error, raw: json.data };
}

export async function postexTrack(cn: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, error: "Not signed in" };
  const res = await fetch(`${API}?action=track&cn=${encodeURIComponent(cn)}`, { headers });
  const json = await res.json();
  return { ok: json.ok, data: json.data, error: json.error };
}

export async function postexTrackBulk(cns: string[]): Promise<{ cn: string; ok: boolean; data?: unknown }[]> {
  if (!cns.length) return [];
  const headers = await authHeaders();
  if (!headers) return [];
  const res = await fetch(`${API}?action=track-bulk&cns=${encodeURIComponent(cns.join(","))}`, { headers });
  const json = await res.json();
  return json.results || [];
}

export async function postexCancel(cn: string): Promise<{ ok: boolean; error?: string }> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, error: "Not signed in" };
  const res = await fetch(`${API}?action=cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cn }),
  });
  const json = await res.json();
  return { ok: json.ok, error: json.error };
}

export async function postexAWB(cns: string[]): Promise<{ ok: boolean; pdfUrl?: string; error?: string }> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, error: "Not signed in" };
  const res = await fetch(`${API}?action=awb&cns=${encodeURIComponent(cns.join(","))}`, { headers });
  const json = await res.json();
  const pdfUrl = json?.data?.dist?.invoiceUrl || json?.data?.invoiceUrl;
  return { ok: json.ok, pdfUrl, error: json.error };
}

export async function postexShipperAdvice(cn: string, statusId: 1 | 2): Promise<{ ok: boolean; error?: string }> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, error: "Not signed in" };
  const res = await fetch(`${API}?action=shipper-advice`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cn, statusId }),
  });
  const json = await res.json();
  return { ok: json.ok, error: json.error };
}

export async function postexPaymentStatus(cn: string): Promise<{ ok: boolean; settled?: boolean; amount?: number; error?: string }> {
  const headers = await authHeaders();
  if (!headers) return { ok: false, error: "Not signed in" };
  const res = await fetch(`${API}?action=payment-status&cn=${encodeURIComponent(cn)}`, { headers });
  const json = await res.json();
  const d = json?.data?.dist || json?.data;
  return { ok: json.ok, settled: d?.settle, amount: d?.amount, error: json.error };
}
