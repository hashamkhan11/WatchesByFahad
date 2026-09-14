import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export type OrderStatus = "pending" | "confirmed" | "dispatched" | "in_transit" | "delivered" | "failed_delivery" | "returned" | "cancelled";

export interface OrderData {
  name: string;
  phone: string;
  address: string;
  city: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  note?: string;
  paymentStatus?: "pending" | "paid" | "failed";
  trackingNumber?: string;
  courierName?: "postex" | "leopard" | string;
  estimatedDeliveryDate?: Date;
  dispatchCost?: number;
  // PostEx sync
  postexStatus?: string;       // latest PostEx status code e.g. "0005"
  postexData?: string;         // JSON of last PostEx tracking response
  postexLastSync?: Date;
  // Call workflow
  callAttempts?: number;
  lastCallAt?: Date;
  callNote?: string;
}

export interface Order extends OrderData {
  id: string;
  status: OrderStatus;
  createdAt: Date;
}

/**
 * Save a new COD order to Firestore directly. Only used by the
 * authenticated admin dashboard's manual-order form, where the price
 * is already read from the catalog and the caller is a signed-in admin.
 * Public, customer-facing checkout must use submitOrder() below instead.
 */
export async function createOrder(data: OrderData): Promise<string> {
  const docRef = await addDoc(collection(db, "orders"), {
    ...data,
    status: "pending" as OrderStatus,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export interface PublicOrderInput {
  groupId: string;
  variantId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  quantity: number;
  note?: string;
}

export interface PublicOrderResult {
  orderId: string;
  price: number;
  productName: string;
}

/**
 * Places a customer-facing COD order through the create-order function,
 * which looks up the real price from the catalog on the server and
 * writes the order itself — the browser never gets to say what the
 * price is, only which product/variant and how many.
 */
export async function submitOrder(input: PublicOrderInput): Promise<PublicOrderResult> {
  const res = await fetch("/.netlify/functions/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  let data: { ok?: boolean; error?: string; orderId?: string; price?: number; productName?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error("Failed to place order");
  }

  if (!res.ok || !data.ok || !data.orderId) {
    throw new Error(data.error || "Failed to place order");
  }

  return { orderId: data.orderId, price: data.price!, productName: data.productName! };
}

/**
 * Fetch all orders sorted by newest first
 */
export async function getOrders(): Promise<Order[]> {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Order, "id">),
    createdAt: d.data().createdAt?.toDate() ?? new Date(),
  }));
}

/**
 * Update the status of an order
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const ref = doc(db, "orders", orderId);
  await updateDoc(ref, { status });
}

/**
 * Permanently delete an order from Firestore
 */
export async function deleteOrder(orderId: string): Promise<void> {
  const ref = doc(db, "orders", orderId);
  await deleteDoc(ref);
}

/**
 * Update editable fields on an order
 */
export async function updateOrder(
  orderId: string,
  data: Partial<OrderData>
): Promise<void> {
  const ref = doc(db, "orders", orderId);
  await updateDoc(ref, data as Record<string, unknown>);
}

/**
 * Subscribe to real-time order updates, newest first
 */
export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Order, "id">),
        createdAt: d.data().createdAt?.toDate() ?? new Date(),
      }));
      callback(orders);
    },
    onError
  );
}