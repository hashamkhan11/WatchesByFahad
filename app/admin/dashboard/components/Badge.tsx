import { OrderStatus } from "@/lib/orders";
import { SC } from "./statusConfig";

export function Badge({ status }: { status: OrderStatus }) {
  const s = SC[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
      {s.icon}{s.label}
    </span>
  );
}
