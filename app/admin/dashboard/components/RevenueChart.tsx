import { useMemo } from "react";
import { BarChart2 } from "lucide-react";
import { Order } from "@/lib/orders";

export function RevenueChart({ orders }: { orders: Order[] }) {
  const days = useMemo(() => {
    const result: { label: string; revenue: number; date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayOrders = orders.filter(o =>
        (o.status === "confirmed" || o.status === "delivered" || o.status === "dispatched" || o.status === "in_transit") &&
        o.createdAt instanceof Date && o.createdAt >= d && o.createdAt < next
      );
      result.push({
        label: d.toLocaleDateString("en-PK", { weekday: "short" }),
        date: d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }),
        revenue: dayOrders.reduce((s, o) => s + o.price * o.quantity, 0),
        count: dayOrders.length,
      });
    }
    return result;
  }, [orders]);

  const max = Math.max(...days.map(d => d.revenue), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-[#C4976A]" />
        <h3 className="font-bold text-gray-900 text-sm">Revenue — Last 7 Days</h3>
        <span className="text-xs text-gray-400 ml-auto">Active orders</span>
      </div>
      <div className="flex items-end gap-2 h-28">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-lg bg-[#C4976A]/80 hover:bg-[#C4976A] transition-colors cursor-default"
              style={{ height: `${Math.max((d.revenue / max) * 96, d.revenue > 0 ? 8 : 2)}px` }}
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
              <div className="bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap text-center">
                {d.date}<br />PKR {d.revenue.toLocaleString()}<br />{d.count} order{d.count !== 1 ? "s" : ""}
              </div>
              <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-1" />
            </div>
            <span className="text-[10px] text-gray-400 font-medium">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
