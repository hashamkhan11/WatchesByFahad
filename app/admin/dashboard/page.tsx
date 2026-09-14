"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  subscribeToOrders, updateOrderStatus, updateOrder, deleteOrder,
  Order, OrderStatus, OrderData,
} from "@/lib/orders";
import { subscribeToStock, setStock, adjustStock, StockMap } from "@/lib/stock";
import { postexTrack, POSTEX_TO_ORDER_STATUS } from "@/lib/postex";
import Link from "next/link";
import {
  LogOut, Loader2, Trash2, Plus, Check, Truck,
  X, Search, ShoppingBag, Package,
  Download, AlertCircle, RefreshCw,
  Clock, MapPin,
} from "lucide-react";

import { allVariants, DateFilter, stockDelta, dateRangeFor, exportCSV, orderAgeHours, fmtDate } from "./components/helpers";
import { SC, TRANS } from "./components/statusConfig";
import { Badge } from "./components/Badge";
import { Toast } from "./components/Toast";
import { RevenueChart } from "./components/RevenueChart";
import { StockPanel } from "./components/StockPanel";
import { CourierModal } from "./components/CourierModal";
import { DetailModal } from "./components/DetailModal";
import { ManualModal } from "./components/ManualModal";
import { DeleteModal } from "./components/DeleteModal";

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked]     = useState(false);
  const [orders, setOrders]               = useState<Order[]>([]);
  const [stock, setStockState]            = useState<StockMap>({});
  const [loading, setLoading]             = useState(true);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [syncingId, setSyncingId]         = useState<string | null>(null);
  const [statusFilter, setStatusFilter]   = useState<OrderStatus | "all">("all");
  const [dateFilter, setDateFilter]       = useState<DateFilter>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [search, setSearch]               = useState("");
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [toast, setToast]                 = useState<string | null>(null);

  const [detailOrder,   setDetailOrder]  = useState<Order | null>(null);
  const [courierOrder,  setCourierOrder] = useState<Order | null>(null);
  const [showManual,    setShowManual]   = useState(false);
  const [deleteTarget,  setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  // Duplicate phone detection
  const phoneDups = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.phone] = (counts[o.phone] ?? 0) + 1; });
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([p]) => p));
  }, [orders]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { if (!u) router.replace("/admin"); else setAuthChecked(true); });
    return () => unsub();
  }, [router]);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const unsub = subscribeToOrders(
      (o) => { setOrders(o); setLoading(false); },
      (err) => { console.error(err); setLoading(false); }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    const unsub = fetchOrders();
    return () => unsub();
  }, [authChecked, fetchOrders]);

  useEffect(() => {
    if (!authChecked) return;
    const unsub = subscribeToStock(setStockState);
    return () => unsub();
  }, [authChecked]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      total:          orders.length,
      today:          orders.filter(o => o.createdAt instanceof Date && o.createdAt >= today).length,
      pending:        orders.filter(o => o.status === "pending").length,
      confirmed:      orders.filter(o => o.status === "confirmed").length,
      dispatched:     orders.filter(o => o.status === "dispatched").length,
      in_transit:     orders.filter(o => o.status === "in_transit").length,
      delivered:      orders.filter(o => o.status === "delivered").length,
      failed_delivery:orders.filter(o => o.status === "failed_delivery").length,
      returned:       orders.filter(o => o.status === "returned").length,
      cancelled:      orders.filter(o => o.status === "cancelled").length,
      revenue:        orders.filter(o => ["confirmed","dispatched","in_transit","delivered"].includes(o.status))
                           .reduce((s, o) => s + o.price * o.quantity, 0),
    };
  }, [orders]);

  const lowStockProducts = useMemo(() =>
    allVariants.filter(p => stock[p.id] !== undefined && stock[p.id] <= 5),
  [stock]);

  const filtered = useMemo(() => {
    let list = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);
    const range = dateRangeFor(dateFilter);
    if (range) list = list.filter(o => o.createdAt instanceof Date && o.createdAt >= range.start && o.createdAt <= range.end);
    if (productFilter !== "all") list = list.filter(o => o.productId === productFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.name.toLowerCase().includes(q) || o.phone.includes(q) ||
        o.city.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q) ||
        (o.trackingNumber ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, dateFilter, productFilter, search]);

  const handleStatusUpdate = async (orderId: string, next: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, next);
      const delta = stockDelta(order.status, next, order.quantity);
      if (delta !== 0) await adjustStock(order.productId, delta);
      setToast(`Marked as ${SC[next]?.label ?? next}`);
      if (detailOrder?.id === orderId) setDetailOrder(prev => prev ? { ...prev, status: next } : null);
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  };

  const handleOrderUpdate = async (orderId: string, data: Partial<OrderData>) => {
    await updateOrder(orderId, data);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...data } : o));
    if (detailOrder?.id === orderId) setDetailOrder(prev => prev ? { ...prev, ...data } : null);
    setToast("Order updated");
  };

  const handleCourierBooked = async (orderId: string, cn: string, courier: "postex" | "leopard") => {
    await updateOrder(orderId, { trackingNumber: cn, courierName: courier });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, trackingNumber: cn, courierName: courier } : o));
    if (detailOrder?.id === orderId) setDetailOrder(prev => prev ? { ...prev, trackingNumber: cn, courierName: courier } : null);
    setToast(`${courier === "postex" ? "PostEx" : "Leopard"} CN saved: ${cn}`);
    setCourierOrder(null);
  };

  const handleSyncTracking = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.trackingNumber || order.courierName !== "postex") return;
    setSyncingId(orderId);
    try {
      const result = await postexTrack(order.trackingNumber);
      if (result.ok && result.data) {
        const raw = result.data as Record<string, unknown>;
        const info = (raw?.dist || raw?.data || raw) as Record<string, unknown>;
        const history = (info?.trackingHistory || info?.history || []) as { statusCode?: string }[];
        const latestCode = history.length > 0 ? history[history.length - 1]?.statusCode : undefined;
        const internalStatus = latestCode ? POSTEX_TO_ORDER_STATUS[latestCode] : undefined;

        const updates: Partial<OrderData> = {
          postexStatus: latestCode || order.postexStatus,
          postexData: JSON.stringify(info),
          postexLastSync: new Date(),
        };

        if (internalStatus && internalStatus !== order.status) {
          await updateOrderStatus(orderId, internalStatus);
          const delta = stockDelta(order.status, internalStatus, order.quantity);
          if (delta !== 0) await adjustStock(order.productId, delta);
          updates.postexStatus = latestCode;
        }

        await updateOrder(orderId, updates);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates, ...(internalStatus ? { status: internalStatus } : {}) } : o));
        if (detailOrder?.id === orderId) {
          setDetailOrder(prev => prev ? { ...prev, ...updates, ...(internalStatus ? { status: internalStatus } : {}) } : null);
        }
        setToast(internalStatus && internalStatus !== order.status ? `Status updated: ${SC[internalStatus]?.label}` : "Tracking synced");
      } else {
        setToast("Sync failed — check CN");
      }
    } catch (e) { console.error(e); setToast("Sync error"); }
    finally { setSyncingId(null); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const ids = deleteTarget.ids;
    setDeletingId(ids[0]);
    try {
      await Promise.all(ids.map(id => deleteOrder(id)));
      setSelected(prev => { const s = new Set(prev); ids.forEach(id => s.delete(id)); return s; });
      setToast(`${ids.length} order${ids.length > 1 ? "s" : ""} deleted`);
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); setDeleteTarget(null); }
  };

  const handleBulkStatus = async (next: OrderStatus) => {
    const ids = Array.from(selected);
    await Promise.all(ids.map(async id => {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      await updateOrderStatus(id, next);
      const delta = stockDelta(order.status, next, order.quantity);
      if (delta !== 0) await adjustStock(order.productId, delta);
    }));
    setSelected(new Set());
    setToast(`${ids.length} orders → ${SC[next]?.label}`);
  };

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const allSelected  = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll    = () => allSelected ? setSelected(new Set()) : setSelected(new Set(filtered.map(o => o.id)));

  const STATUS_TABS: { key: OrderStatus | "all"; label: string; count: number }[] = [
    { key: "all",          label: "All",         count: stats.total },
    { key: "pending",      label: "Pending",      count: stats.pending },
    { key: "confirmed",    label: "Confirmed",    count: stats.confirmed },
    { key: "dispatched",   label: "Dispatched",   count: stats.dispatched },
    { key: "in_transit",   label: "In Transit",   count: stats.in_transit },
    { key: "delivered",    label: "Delivered",    count: stats.delivered },
    { key: "failed_delivery", label: "Failed",    count: stats.failed_delivery },
    { key: "returned",     label: "Returned",     count: stats.returned },
    { key: "cancelled",    label: "Cancelled",    count: stats.cancelled },
  ];

  const DATE_TABS: { key: DateFilter; label: string }[] = [
    { key: "all", label: "All time" }, { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" }, { key: "week", label: "Last 7 days" },
    { key: "month", label: "Last 30 days" },
  ];

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {detailOrder && (
        <DetailModal
          order={detailOrder} onClose={() => setDetailOrder(null)}
          onStatusUpdate={handleStatusUpdate} onOrderUpdate={handleOrderUpdate}
          updating={updatingId === detailOrder.id}
          onBookCourier={() => { setCourierOrder(detailOrder); setDetailOrder(null); }}
          onSyncTracking={() => handleSyncTracking(detailOrder.id)}
          syncing={syncingId === detailOrder.id}
        />
      )}
      {courierOrder && (
        <CourierModal
          order={courierOrder}
          onClose={() => setCourierOrder(null)}
          onBooked={(cn, courier) => handleCourierBooked(courierOrder.id, cn, courier)}
        />
      )}
      {showManual && (
        <ManualModal onClose={() => setShowManual(false)} onCreated={() => setToast("Order created")} />
      )}
      {deleteTarget && (
        <DeleteModal label={deleteTarget.label} onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)} loading={deletingId !== null} />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#C4976A]" strokeWidth={1.5} />
            <span className="font-bold text-gray-900 text-sm tracking-tight">WatchesByFahad</span>
            <span className="text-gray-300 text-sm hidden sm:inline">/</span>
            <span className="text-gray-500 text-sm hidden sm:inline">Admin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href="/track" target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <MapPin className="w-3.5 h-3.5" />Track Page
            </Link>
            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-gray-800 transition-colors">
              <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Order</span>
            </button>
            <button onClick={() => exportCSV(filtered)} title="Export CSV"
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={async () => { await signOut(auth); router.push("/admin"); }} title="Logout"
              className="p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Urgent alerts */}
        {stats.pending > 0 && (
          <div className="bg-amber-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">{stats.pending} order{stats.pending > 1 ? "s" : ""} waiting for confirmation</p>
                <p className="text-xs text-amber-100 mt-0.5">Review and confirm to start delivery</p>
              </div>
            </div>
            <button onClick={() => { setStatusFilter("pending"); setSearch(""); setSelected(new Set()); }}
              className="flex-shrink-0 bg-white text-amber-600 text-xs font-bold px-4 py-2 rounded-xl hover:bg-amber-50 transition-colors">
              Review
            </button>
          </div>
        )}

        {stats.failed_delivery > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-orange-700">{stats.failed_delivery} failed delivery — action needed</p>
              <p className="text-xs text-orange-500 mt-0.5">Contact customers or request return via PostEx</p>
            </div>
            <button onClick={() => setStatusFilter("failed_delivery")}
              className="ml-auto text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-xl hover:bg-orange-200 transition-colors">
              View
            </button>
          </div>
        )}

        {lowStockProducts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm text-red-700">Low stock: {lowStockProducts.map(p => `${p.name} (${stock[p.id] ?? 0})`).join(", ")}</p>
              <p className="text-xs text-red-500 mt-0.5">Restock soon to avoid missed orders</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Revenue",    value: `PKR ${stats.revenue >= 1000 ? (stats.revenue/1000).toFixed(0)+"k" : stats.revenue.toLocaleString()}`, sub: "Active orders", color: "text-[#C4976A]", icon: "💰" },
            { label: "Today",      value: stats.today,          sub: "New orders",   color: "text-blue-600",  icon: "📅" },
            { label: "Pending",    value: stats.pending,        sub: "Need confirm", color: "text-amber-600", icon: "⏳" },
            { label: "In Transit", value: stats.dispatched + stats.in_transit, sub: "With courier", color: "text-indigo-600", icon: "🚚" },
            { label: "Delivered",  value: stats.delivered,      sub: "Completed",    color: "text-green-600", icon: "✅" },
            { label: "Issues",     value: stats.failed_delivery + stats.returned + stats.cancelled, sub: "Need attention", color: "text-red-500", icon: "⚠️" },
          ].map(({ label, value, sub, color, icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <span className="text-lg">{icon}</span>
              <p className={`text-xl font-bold ${color} mt-2`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
              <p className="text-[10px] text-gray-300 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Chart + Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RevenueChart orders={orders} />
          <StockPanel stock={stock} onSave={async (id, val) => { await setStock(id, val); setToast("Stock updated"); }} />
        </div>

        {/* Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="px-5 pt-5 pb-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-bold text-gray-900">Orders</h2>
                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={productFilter} onChange={e => { setProductFilter(e.target.value); setSelected(new Set()); }}
                  className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-600 font-medium">
                  <option value="all">All products</option>
                  {allVariants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input type="text" placeholder="Name, phone, CN…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 bg-gray-50 focus:bg-white transition-colors w-44" />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {DATE_TABS.map(({ key, label }) => (
                <button key={key} onClick={() => { setDateFilter(key); setSelected(new Set()); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    dateFilter === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>{label}</button>
              ))}
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {STATUS_TABS.map(({ key, label, count }) => (
                <button key={key} onClick={() => { setStatusFilter(key); setSelected(new Set()); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    statusFilter === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    statusFilter === key ? "bg-white/20 text-white" : "bg-white text-gray-500"
                  }`}>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="px-5 py-3 bg-gray-900 flex flex-wrap items-center gap-2.5">
              <span className="text-white text-sm font-semibold">{selected.size} selected</span>
              <div className="flex flex-wrap gap-2 ml-auto">
                {[
                  { label: "Confirm",    fn: () => handleBulkStatus("confirmed"),  cls: "bg-blue-500 hover:bg-blue-400" },
                  { label: "Dispatched", fn: () => handleBulkStatus("dispatched"), cls: "bg-indigo-500 hover:bg-indigo-400" },
                  { label: "Delivered",  fn: () => handleBulkStatus("delivered"),  cls: "bg-green-500 hover:bg-green-400" },
                  { label: "Cancel",     fn: () => handleBulkStatus("cancelled"),  cls: "bg-white/10 hover:bg-white/20" },
                ].map(({ label, fn, cls }) => (
                  <button key={label} onClick={fn} className={`text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-colors ${cls}`}>{label}</button>
                ))}
                <button onClick={() => setDeleteTarget({ ids: Array.from(selected), label: `Permanently delete ${selected.size} order${selected.size > 1 ? "s" : ""}?` })}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-400 transition-colors">
                  Delete
                </button>
                <button onClick={() => setSelected(new Set())} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-28"><Loader2 className="w-7 h-7 animate-spin text-gray-200" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-300">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-400">No orders found</p>
              {(search || dateFilter !== "all" || productFilter !== "all") && (
                <p className="text-xs text-gray-300 mt-1">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 w-10">
                        <button onClick={toggleAll} className="flex items-center justify-center">
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            allSelected ? "bg-gray-900 border-gray-900" : someSelected ? "bg-gray-400 border-gray-400" : "border-gray-300"
                          }`}>
                            {(allSelected || someSelected) && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                        </button>
                      </th>
                      {["Customer", "Product", "Amount", "City", "Courier", "Status", "Date", "Actions"].map(h => (
                        <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(order => {
                      const trans      = TRANS[order.status] ?? [];
                      const isUpdating = updatingId === order.id;
                      const isSelected = selected.has(order.id);
                      const age        = orderAgeHours(order);
                      const isDup      = phoneDups.has(order.phone);
                      const isUrgent   = order.status === "pending" && age > 4;
                      return (
                        <tr key={order.id} className={`transition-colors ${isSelected ? "bg-blue-50/50" : isUrgent ? "bg-amber-50/30" : "hover:bg-gray-50/60"}`}>
                          <td className="px-5 py-3.5">
                            <button onClick={() => toggleSelect(order.id)} className="flex items-center justify-center">
                              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <button onClick={() => setDetailOrder(order)} className="text-left group">
                              <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 flex-wrap">
                                {order.name}
                                {order.note && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">NOTE</span>}
                                {isDup && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">DUP</span>}
                                {isUrgent && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse">URGENT</span>}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{order.phone}</p>
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-gray-700 max-w-[140px] truncate text-sm">{order.productName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">×{order.quantity}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-gray-900">PKR {(order.price * order.quantity).toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{order.city}</td>
                          <td className="px-4 py-3.5">
                            {order.trackingNumber ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  order.courierName === "postex" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                                }`}>{order.courierName}</span>
                                <span className="text-xs font-mono text-gray-500 truncate max-w-[80px]">{order.trackingNumber}</span>
                                {order.courierName === "postex" && (
                                  <button onClick={() => handleSyncTracking(order.id)} disabled={syncingId === order.id} title="Sync tracking"
                                    className="text-gray-300 hover:text-blue-500 transition-colors disabled:opacity-50">
                                    <RefreshCw className={`w-3 h-3 ${syncingId === order.id ? "animate-spin" : ""}`} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button onClick={() => setCourierOrder(order)}
                                className="text-[10px] font-bold text-gray-400 hover:text-gray-700 border border-dashed border-gray-200 hover:border-gray-400 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                                <Truck className="w-3 h-3" />Book
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3.5"><Badge status={order.status} /></td>
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(order.createdAt)}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {trans.filter(t => t.primary).slice(0, 1).map(({ next, label }) => (
                                <button key={next} onClick={() => handleStatusUpdate(order.id, next)} disabled={isUpdating}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap">
                                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin inline" /> : label}
                                </button>
                              ))}
                              <button onClick={() => setDetailOrder(order)}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                                ···
                              </button>
                              <button onClick={() => setDeleteTarget({ ids: [order.id], label: `Delete order from ${order.name}?` })}
                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      allSelected ? "bg-gray-900 border-gray-900" : someSelected ? "bg-gray-400 border-gray-400" : "border-gray-300"
                    }`}>
                      {(allSelected || someSelected) && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                  <span className="text-xs text-gray-400">{filtered.length} orders</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filtered.map(order => {
                    const trans      = TRANS[order.status] ?? [];
                    const isSelected = selected.has(order.id);
                    const isUpdating = updatingId === order.id;
                    const isDup      = phoneDups.has(order.phone);
                    const isUrgent   = order.status === "pending" && orderAgeHours(order) > 4;
                    return (
                      <div key={order.id} className={`p-4 transition-colors ${isSelected ? "bg-blue-50/40" : isUrgent ? "bg-amber-50/30" : ""}`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleSelect(order.id)} className="mt-1 flex-shrink-0">
                            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300"
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </span>
                          </button>
                          <div className="flex-1 min-w-0" onClick={() => setDetailOrder(order)}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-900">{order.name}</span>
                                  {order.note && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">NOTE</span>}
                                  {isDup && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">DUP</span>}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{order.phone} · {order.city}</p>
                              </div>
                              <Badge status={order.status} />
                            </div>
                            <p className="text-sm text-gray-600 truncate">{order.productName} ×{order.quantity}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="font-bold text-gray-900 text-sm">PKR {(order.price * order.quantity).toLocaleString()}</span>
                              {order.trackingNumber ? (
                                <span className="text-xs font-mono text-gray-400">{order.trackingNumber}</span>
                              ) : (
                                <span className="text-xs text-gray-300">{fmtDate(order.createdAt)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 ml-7">
                          {trans.filter(t => t.primary).slice(0, 1).map(({ next, label }) => (
                            <button key={next} onClick={() => handleStatusUpdate(order.id, next)} disabled={isUpdating}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
                              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin inline" /> : label}
                            </button>
                          ))}
                          {!order.trackingNumber && (
                            <button onClick={() => setCourierOrder(order)}
                              className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1">
                              <Truck className="w-3 h-3" />Book
                            </button>
                          )}
                          <button onClick={() => setDetailOrder(order)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                            Details
                          </button>
                          <button onClick={() => setDeleteTarget({ ids: [order.id], label: `Delete order from ${order.name}?` })}
                            className="p-2 rounded-xl border border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          {stats.total} total · PKR {stats.revenue.toLocaleString()} revenue · {stats.dispatched + stats.in_transit} in transit
        </p>
      </main>
    </div>
  );
}
