import { useState } from "react";
import { Loader2, X, Check, Zap } from "lucide-react";
import { Order } from "@/lib/orders";
import { postexBook } from "@/lib/postex";

export function CourierModal({ order, onClose, onBooked }: {
  order: Order;
  onClose: () => void;
  onBooked: (cn: string, courier: "postex" | "leopard") => Promise<void>;
}) {
  const [tab, setTab] = useState<"postex" | "leopard">("postex");
  const [leopardCn, setLeopardCn] = useState(order.trackingNumber ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const handlePostex = async () => {
    setLoading(true); setError("");
    try {
      const result = await postexBook({
        orderId: order.id,
        name: order.name,
        phone: order.phone,
        address: order.address,
        city: order.city,
        productName: order.productName,
        price: order.price,
        quantity: order.quantity,
      });
      if (result.ok && result.trackingNumber) {
        await onBooked(result.trackingNumber, "postex");
        setSuccess(result.trackingNumber);
      } else {
        setError(result.error || "PostEx booking failed. Check city name and try again.");
      }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const handleLeopard = async () => {
    if (!leopardCn.trim()) { setError("Enter Leopard CN"); return; }
    setLoading(true); setError("");
    try {
      await onBooked(leopardCn.trim().toUpperCase(), "leopard");
      setSuccess(leopardCn.trim().toUpperCase());
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  };

  const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white font-mono";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Book Courier</h2>
            <p className="text-xs text-gray-400 mt-0.5">{order.name} · {order.city}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        {success ? (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Booked!</p>
              <p className="text-sm text-gray-500 mt-1">Tracking Number</p>
              <p className="font-mono text-xl font-bold text-gray-900 mt-1">{success}</p>
            </div>
            <button onClick={onClose}
              className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {(["postex", "leopard"] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
                  {t === "postex" ? "PostEx" : "Leopard"}
                </button>
              ))}
            </div>

            {/* Order summary */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Product</span>
                <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{order.productName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">COD Amount</span>
                <span className="font-bold text-gray-900">PKR {(order.price * order.quantity).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery City</span>
                <span className="font-semibold text-gray-900">{order.city}</span>
              </div>
            </div>

            {tab === "postex" ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  This will create a PostEx COD shipment from <strong>Faisalabad</strong> and return a tracking number automatically.
                </p>
                {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">{error}</p>}
                <button onClick={handlePostex} disabled={loading}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Booking…</> : <><Zap className="w-4 h-4" />Book PostEx Shipment</>}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Leopard Tracking Number</label>
                  <input value={leopardCn} onChange={e => setLeopardCn(e.target.value.toUpperCase())}
                    placeholder="e.g. LP123456789PK" className={inp} />
                </div>
                <p className="text-xs text-gray-400">Enter the CN from your Leopard retail account manually.</p>
                {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">{error}</p>}
                <button onClick={handleLeopard} disabled={loading || !leopardCn.trim()}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Check className="w-4 h-4" />Save Leopard CN</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
