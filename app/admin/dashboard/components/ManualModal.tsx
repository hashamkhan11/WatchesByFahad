import { useState } from "react";
import { X, Loader2, Plus } from "lucide-react";
import { createOrder, OrderData } from "@/lib/orders";
import { allVariants } from "./helpers";

// Admin-only manual order creation form. The product (and therefore price)
// is always selected from the catalog-derived `allVariants` list below —
// never a free-text price field — so this trusted, authenticated-admin
// path can keep writing directly via `createOrder()` (lib/orders.ts)
// instead of going through the public create-order function.
export function ManualModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", productId: "", quantity: "1", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const product = allVariants.find(p => p.id === form.productId);
  const total = product ? product.price * (parseInt(form.quantity) || 1) : 0;
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }));
  const inp = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim()) {
      setError("Please fill all required fields"); return;
    }
    setSubmitting(true); setError("");
    try {
      const data: OrderData = {
        name: form.name.trim(), phone: form.phone.trim(),
        address: form.address.trim(), city: form.city.trim(),
        productId: product.id, productName: product.name,
        price: product.price, quantity: parseInt(form.quantity) || 1,
        ...(form.note.trim() && { note: form.note.trim() }),
      };
      await createOrder(data);
      onCreated();
      onClose();
    } catch { setError("Failed. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">New Manual Order</h2>
            <p className="text-xs text-gray-400 mt-0.5">WhatsApp / phone order</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Product *</label>
            <select value={form.productId} onChange={set("productId")} className={inp}>
              <option value="">Select product…</option>
              {allVariants.map(p => <option key={p.id} value={p.id}>{p.name} — PKR {p.price.toLocaleString()}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Name *</label><input value={form.name} onChange={set("name")} placeholder="Ali Hassan" className={inp} /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone *</label><input value={form.phone} onChange={set("phone")} placeholder="03001234567" className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">City *</label><input value={form.city} onChange={set("city")} placeholder="Karachi" className={inp} /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Quantity</label><input type="number" min="1" value={form.quantity} onChange={set("quantity")} className={inp} /></div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Address *</label><textarea value={form.address} onChange={set("address")} placeholder="Full delivery address" rows={2} className={`${inp} resize-none`} /></div>
          <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">Note (optional)</label><input value={form.note} onChange={set("note")} placeholder="Special instructions…" className={inp} /></div>
          {product && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total (COD)</span>
              <span className="text-base font-bold text-gray-900">PKR {total.toLocaleString()}</span>
            </div>
          )}
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {submitting ? "Creating…" : "Create Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
