import {
  Clock, CheckCheck, Send, Truck, Check, AlertCircle, Undo2, XCircle,
} from "lucide-react";
import { OrderStatus } from "@/lib/orders";

// ── Status config — ALL 8 statuses ────────────────────────────────────────────

export const SC: Record<OrderStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending:        { label: "Pending",        bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  icon: <Clock className="w-3 h-3" /> },
  confirmed:      { label: "Confirmed",      bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200",   icon: <CheckCheck className="w-3 h-3" /> },
  dispatched:     { label: "Dispatched",     bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-200", icon: <Send className="w-3 h-3" /> },
  in_transit:     { label: "In Transit",     bg: "bg-sky-50",     text: "text-sky-700",    border: "border-sky-200",    icon: <Truck className="w-3 h-3" /> },
  delivered:      { label: "Delivered",      bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200",  icon: <Check className="w-3 h-3" /> },
  failed_delivery:{ label: "Failed Delivery",bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200", icon: <AlertCircle className="w-3 h-3" /> },
  returned:       { label: "Returned",       bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200", icon: <Undo2 className="w-3 h-3" /> },
  cancelled:      { label: "Cancelled",      bg: "bg-red-50",     text: "text-red-600",    border: "border-red-200",    icon: <XCircle className="w-3 h-3" /> },
};

export const TRANS: Record<OrderStatus, { next: OrderStatus; label: string; primary?: boolean; danger?: boolean }[]> = {
  pending:        [{ next: "confirmed", label: "Confirm", primary: true }, { next: "cancelled", label: "Cancel", danger: true }],
  confirmed:      [{ next: "dispatched", label: "Mark Dispatched", primary: true }, { next: "cancelled", label: "Cancel", danger: true }, { next: "pending", label: "Revert Pending" }],
  dispatched:     [{ next: "in_transit", label: "In Transit", primary: true }, { next: "confirmed", label: "Revert Confirmed" }],
  in_transit:     [{ next: "delivered", label: "Mark Delivered", primary: true }, { next: "failed_delivery", label: "Failed Delivery", danger: true }],
  delivered:      [{ next: "returned", label: "Mark Returned" }, { next: "in_transit", label: "Revert In Transit" }],
  failed_delivery:[{ next: "in_transit", label: "Retry Delivery", primary: true }, { next: "returned", label: "Return to Origin", danger: true }],
  returned:       [{ next: "delivered", label: "Revert Delivered" }, { next: "pending", label: "Reopen as Pending" }],
  cancelled:      [{ next: "pending", label: "Reopen Order", primary: true }],
};
