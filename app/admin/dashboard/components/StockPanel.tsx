import { useState } from "react";
import { Package, Loader2, X, Edit2 } from "lucide-react";
import { StockMap } from "@/lib/stock";
import { allVariants } from "./helpers";

export function StockPanel({ stock, onSave }: { stock: StockMap; onSave: (id: string, val: number) => Promise<void> }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const LOW = 5;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-[#C4976A]" />
        <h3 className="font-bold text-gray-900 text-sm">Stock</h3>
        <span className="text-xs text-gray-400 ml-auto">Admin only</span>
      </div>
      <div className="space-y-2">
        {allVariants.map(p => {
          const qty = stock[p.id] ?? 0;
          const low = qty <= LOW;
          return (
            <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${low ? "bg-red-50" : "bg-gray-50"}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
              </div>
              {editing === p.id ? (
                <div className="flex items-center gap-2">
                  <input type="number" min={0} value={val} onChange={e => setVal(e.target.value)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900" autoFocus />
                  <button disabled={saving}
                    onClick={async () => { setSaving(true); await onSave(p.id, parseInt(val) || 0); setSaving(false); setEditing(null); }}
                    className="text-xs font-bold text-white bg-gray-900 px-3 py-1.5 rounded-lg disabled:opacity-50">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                  </button>
                  <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${low ? "text-red-600" : "text-gray-900"}`}>
                    {qty} {low && <span className="text-[10px] text-red-500 font-semibold">LOW</span>}
                  </span>
                  <button onClick={() => { setEditing(p.id); setVal(String(qty)); }}
                    className="text-gray-300 hover:text-gray-600 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
