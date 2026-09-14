import { useState } from "react";
import {
  Copy, Check, X, Edit2, Truck, RefreshCw, ExternalLink, Phone,
  Loader2, XCircle, MessageCircle,
} from "lucide-react";
import { Order, OrderStatus, OrderData } from "@/lib/orders";
import { POSTEX_STATUS } from "@/lib/postex";
import { useCopy, fmtDate, buildDispatchWAMsg } from "./helpers";
import { SC, TRANS } from "./statusConfig";
import { Badge } from "./Badge";

export function DetailModal({ order, onClose, onStatusUpdate, onOrderUpdate, updating, onBookCourier, onSyncTracking, syncing }: {
  order: Order; onClose: () => void;
  onStatusUpdate: (id: string, next: OrderStatus) => Promise<void>;
  onOrderUpdate: (id: string, data: Partial<OrderData>) => Promise<void>;
  updating: boolean;
  onBookCourier: () => void;
  onSyncTracking: () => Promise<void>;
  syncing: boolean;
}) {
  const { copied, copy } = useCopy();
  const trans = TRANS[order.status] ?? [];
  const total = order.price * order.quantity;
  const waNum = order.phone.replace(/^0/, "92");
  const waConfirmMsg = [
    `*Order Confirmation* 📦`, `━━━━━━━━━━━━━`,
    `👤 *Name:* ${order.name}`, `📱 *Phone:* ${order.phone}`,
    `📦 *Product:* ${order.productName}`, `🔢 *Qty:* ${order.quantity}`,
    `💰 *Amount:* PKR ${total.toLocaleString()}`,
    `📍 *Address:* ${order.address}`, `🏙️ *City:* ${order.city}`,
    order.note ? `📝 *Note:* ${order.note}` : null,
    `━━━━━━━━━━━━━`, `✅ COD — Cash on Delivery`,
  ].filter(Boolean).join("\n");
  const waDispatchMsg = buildDispatchWAMsg(order);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: order.name, phone: order.phone, address: order.address, city: order.city,
    quantity: String(order.quantity), note: order.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [loggingCall, setLoggingCall] = useState(false);
  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900";

  const handleLogCall = async () => {
    setLoggingCall(true);
    await onOrderUpdate(order.id, {
      callAttempts: (order.callAttempts ?? 0) + 1,
      lastCallAt: new Date(),
      callNote: callNote.trim() || undefined,
    });
    setCallNote("");
    setLoggingCall(false);
  };

  const trackUrl = order.trackingNumber ? `https://watchesbyfahad.com/track?cn=${encodeURIComponent(order.trackingNumber)}` : null;
  const postexSt = order.postexStatus ? POSTEX_STATUS[order.postexStatus] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 flex-shrink-0">
              {order.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{order.name}</p>
              <p className="text-xs text-gray-400">{fmtDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={order.status} />
            <button onClick={() => setEditing(e => !e)}
              className={`p-1.5 rounded-lg transition-colors ${editing ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-400"}`}>
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inp} /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Quantity</label><input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inp} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Address</label><textarea rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={`${inp} resize-none`} /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Note</label><input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className={inp} placeholder="Optional…" /></div>
            </div>
          ) : (
            <>
              {/* Customer */}
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Customer</p>
                <div className="space-y-2.5">
                  {([["Name", order.name, "nm"], ["Phone", order.phone, "ph"], ["City", order.city, "ct"]] as [string, string, string][]).map(([label, value, key]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{value}</span>
                        <button onClick={() => copy(value, key)} className="text-gray-300 hover:text-gray-600 transition-colors">
                          {copied === key ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-gray-400 flex-shrink-0">Address</span>
                    <div className="flex items-start gap-2 text-right">
                      <span className="text-sm font-semibold text-gray-900">{order.address}</span>
                      <button onClick={() => copy(order.address, "ad")} className="text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5">
                        {copied === "ad" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* Order */}
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Order</p>
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-gray-400">Product</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{order.productName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Quantity</span>
                    <span className="text-sm font-semibold text-gray-900">{order.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-900">Total (COD)</span>
                    <span className="text-lg font-bold text-gray-900">PKR {total.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {order.note && (
                <>
                  <div className="border-t border-gray-100" />
                  <section>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Note</p>
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{order.note}</p>
                  </section>
                </>
              )}

              {/* Courier & Tracking */}
              <div className="border-t border-gray-100" />
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Courier & Tracking</p>
                  {order.trackingNumber && order.courierName === "postex" && (
                    <button onClick={onSyncTracking} disabled={syncing}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors disabled:opacity-50">
                      <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                      Sync
                    </button>
                  )}
                </div>
                {order.trackingNumber ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Courier</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                        order.courierName === "postex" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>{order.courierName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Tracking #</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-gray-900">{order.trackingNumber}</span>
                        <button onClick={() => copy(order.trackingNumber!, "cn")} className="text-gray-300 hover:text-gray-600">
                          {copied === "cn" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    {postexSt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Courier Status</span>
                        <span className="text-sm font-semibold text-gray-900">{postexSt.en}</span>
                      </div>
                    )}
                    {trackUrl && (
                      <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                        <ExternalLink className="w-3 h-3" />Track Order Page
                      </a>
                    )}
                    {order.postexLastSync instanceof Date && (
                      <p className="text-[10px] text-gray-400">Last synced: {fmtDate(order.postexLastSync)}</p>
                    )}
                  </div>
                ) : (
                  <button onClick={onBookCourier}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 font-semibold transition-colors flex items-center justify-center gap-2">
                    <Truck className="w-4 h-4" />Book Courier
                  </button>
                )}
              </section>

              {/* Call Log */}
              <div className="border-t border-gray-100" />
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Call Log</p>
                {order.callAttempts ? (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-900">{order.callAttempts} attempt{order.callAttempts > 1 ? "s" : ""}</span>
                      {order.lastCallAt instanceof Date && (
                        <span className="text-xs text-gray-400 ml-auto">Last: {fmtDate(order.lastCallAt)}</span>
                      )}
                    </div>
                    {order.callNote && <p className="text-xs text-gray-500 mt-1 pl-5">{order.callNote}</p>}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <input value={callNote} onChange={e => setCallNote(e.target.value)} placeholder="Call note (optional)…"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  <button onClick={handleLogCall} disabled={loggingCall}
                    className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-60">
                    {loggingCall ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}Log
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="px-6 pt-4 pb-6 border-t border-gray-100 space-y-2.5 flex-shrink-0">
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await onOrderUpdate(order.id, {
                    name: form.name.trim(), phone: form.phone.trim(),
                    address: form.address.trim(), city: form.city.trim(),
                    quantity: parseInt(form.quantity) || 1,
                    ...(form.note.trim() ? { note: form.note.trim() } : { note: undefined }),
                  });
                  setSaving(false); setEditing(false);
                }}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save Changes
              </button>
            </div>
          ) : (
            <>
              {/* WhatsApp buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => copy(order.trackingNumber ? waDispatchMsg : waConfirmMsg, "wa")}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1fba5b] text-white text-sm font-bold transition-colors">
                  {copied === "wa" ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />{order.trackingNumber ? "Copy Dispatch Msg" : "Copy Confirm Msg"}</>}
                </button>
                <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#25D366] text-[#25D366] text-sm font-bold hover:bg-green-50 transition-colors">
                  <MessageCircle className="w-4 h-4" />Open Chat
                </a>
              </div>

              {/* Status transitions */}
              {trans.length > 0 && (
                <div className="flex flex-col gap-2">
                  {trans.filter(t => !t.danger).length > 0 && (
                    <div className={`grid gap-2 ${trans.filter(t => !t.danger).length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {trans.filter(t => !t.danger).map(({ next, label, primary }) => (
                        <button key={next} disabled={updating}
                          onClick={async () => { await onStatusUpdate(order.id, next); onClose(); }}
                          className={`py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                            primary ? "bg-gray-900 text-white hover:bg-gray-800" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}>
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : SC[next]?.icon}{label}
                        </button>
                      ))}
                    </div>
                  )}
                  {trans.filter(t => t.danger).map(({ next, label }) => (
                    <button key={next} disabled={updating}
                      onClick={async () => { await onStatusUpdate(order.id, next); onClose(); }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50">
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}{label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
