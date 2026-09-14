import { useState } from "react";
import { Order, OrderStatus } from "@/lib/orders";
import { catalog } from "@/data/catalog";

// Shared catalog-derived product list used across the admin dashboard
// (manual order form, stock panel, product filter, etc).
export const allVariants = catalog.flatMap(cat =>
  cat.groups.flatMap(g =>
    g.variants.map(v => ({
      id:    `${g.id}-${v.id}`,
      name:  `${g.fullName} — ${v.name}`,
      price: g.price,
    }))
  )
);

export type DateFilter = "all" | "today" | "yesterday" | "week" | "month";

export function stockDelta(prev: OrderStatus, next: OrderStatus, qty: number): number {
  const wasDelivered = prev === "delivered";
  const wasReturned  = prev === "returned";
  const nowDelivered = next === "delivered";
  const nowReturned  = next === "returned";
  if (!wasDelivered && nowDelivered) return -qty;
  if (wasDelivered && !nowDelivered) return +qty;
  if (!wasReturned && nowReturned)   return +qty;
  if (wasReturned && !nowReturned)   return -qty;
  return 0;
}

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

export function fmtDate(d: unknown) {
  return d instanceof Date
    ? d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
}

export function orderAgeHours(o: Order): number {
  if (!(o.createdAt instanceof Date)) return 0;
  return (Date.now() - o.createdAt.getTime()) / 3600000;
}

export function dateRangeFor(f: DateFilter): { start: Date; end: Date } | null {
  if (f === "all") return null;
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  if (f === "today") return { start: today, end: now };
  if (f === "yesterday") {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    const ye = new Date(today); ye.setMilliseconds(-1);
    return { start: y, end: ye };
  }
  if (f === "week") { const s = new Date(today); s.setDate(s.getDate() - 6); return { start: s, end: now }; }
  if (f === "month") { const s = new Date(today); s.setDate(s.getDate() - 29); return { start: s, end: now }; }
  return null;
}

export function exportCSV(orders: Order[]) {
  const header = ["ID", "Name", "Phone", "City", "Address", "Product", "Qty", "Price", "Total", "Status", "Courier", "CN", "Date", "Note"];
  const rows = orders.map(o => [
    o.id, o.name, o.phone, o.city,
    `"${o.address.replace(/"/g, '""')}"`,
    o.productName, o.quantity, o.price, o.price * o.quantity, o.status,
    o.courierName ?? "", o.trackingNumber ?? "",
    o.createdAt instanceof Date ? o.createdAt.toISOString() : "",
    o.note ? `"${o.note.replace(/"/g, '""')}"` : "",
  ]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function buildDispatchWAMsg(order: Order): string {
  const total = order.price * order.quantity;
  const cn = order.trackingNumber ?? "";
  const trackUrl = cn ? `https://watchesbyfahad.com/track?cn=${encodeURIComponent(cn)}` : "";
  return [
    `*آپ کا آرڈر روانہ ہو گیا* 🚚`,
    `━━━━━━━━━━━━━`,
    `👤 *نام:* ${order.name}`,
    `📦 *پراڈکٹ:* ${order.productName}`,
    `💰 *COD رقم:* PKR ${total.toLocaleString()}`,
    ``,
    cn ? `*ٹریکنگ نمبر:* ${cn}` : null,
    trackUrl ? `🔗 *ٹریک کریں:* ${trackUrl}` : null,
    ``,
    `📞 کوئی سوال ہو تو یہاں پیغام کریں`,
    `━━━━━━━━━━━━━`,
    `_WatchesByFahad — آپ کا اعتماد ہماری پہچان_`,
  ].filter(Boolean).join("\n");
}
