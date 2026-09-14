"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { sha256, trackEvent } from "@/lib/tiktok";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

interface FormValues {
  name: string;
  phone: string;
  address: string;
  city: string;
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    mode: "onTouched",
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);

    try {
      const { submitOrder } = await import("@/lib/orders");

      const orderIds: string[] = [];
      let confirmedTotal = 0;
      const confirmedPrices: Record<string, number> = {};
      for (const item of items) {
        const result = await submitOrder({
          groupId: item.product.groupId,
          variantId: item.product.variantId,
          name: data.name.trim(),
          phone: data.phone.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          quantity: item.quantity,
        });
        orderIds.push(result.orderId);
        confirmedPrices[item.product.id] = result.price;
        confirmedTotal += result.price * item.quantity;
      }

      const hashedPhone = await sha256(data.phone.trim());
      if (typeof window !== "undefined" && window.ttq) {
        window.ttq.identify({ phone_number: hashedPhone });
      }
      const contents = items.map((i) => ({
        content_id: i.product.id, content_type: "product",
        content_name: i.product.name, price: confirmedPrices[i.product.id] ?? i.product.price, num_items: i.quantity,
      }));
      const userData = { phone: hashedPhone };
      await trackEvent("PlaceAnOrder", { contents, value: confirmedTotal, currency: "PKR" }, userData);
      await trackEvent("Purchase",     { contents, value: confirmedTotal, currency: "PKR" }, userData);

      clearCart();
      reset();
      closeCart();
      setStep("cart");

      // Build WhatsApp message
      const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "923000000000";
      const itemsList = items
        .map((i) => `• ${i.product.name} × ${i.quantity}`)
        .join("\n");
      const msg = encodeURIComponent(
        `Assalam o Alaikum! I just placed a COD order:\n\n${itemsList}\n\nTotal: Rs. ${confirmedTotal.toLocaleString()}\nName: ${data.name}\nPhone: ${data.phone}\n\nPlease confirm. 🙏`
      );

      // Redirect to thank you, pass value for pixel
      router.push(`/thankyou?value=${confirmedTotal}&order_id=${orderIds[0] ?? ""}`);

      setTimeout(() => {
        window.open(`https://wa.me/${number}?text=${msg}`, "_blank");
      }, 1200);
    } catch {
      alert("Something went wrong. Please try again or contact us on WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 drawer-backdrop"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Shopping cart"
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white flex flex-col animate-[drawerIn_0.32s_cubic-bezier(0.32,0.72,0,1)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
            <span className="font-display text-lg font-semibold text-gray-900">
              Your Cart
            </span>
          </div>
          <button
            onClick={() => { closeCart(); setStep("cart"); }}
            aria-label="Close cart"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="w-10 h-10 text-gray-200" strokeWidth={1} />
            <p className="text-sm text-gray-400 leading-relaxed">
              Your cart is empty.<br />
              Browse the collection below.
            </p>
            <button onClick={closeCart} className="btn-outline text-xs mt-2">
              Continue Shopping
            </button>
          </div>
        )}

        {/* Cart step */}
        {items.length > 0 && step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-4">
                  <div className="relative w-20 h-20 bg-gray-50 flex-shrink-0 overflow-hidden">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PKR {product.price.toLocaleString()}
                    </p>
                    {/* Qty controls */}
                    <div className="flex items-center gap-3 mt-2.5">
                      <div className="flex items-center border border-gray-200">
                        <button
                          onClick={() => updateQty(product.id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQty(product.id, quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-[11px] text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    PKR {(product.price * quantity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Cart footer */}
            <div className="px-6 py-5 border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total</span>
                <span className="font-display text-xl font-semibold text-gray-900">
                  PKR {totalPrice.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 -mt-1">
                Cash on Delivery — pay when it arrives.
              </p>
              <button
                onClick={() => {
                  trackEvent("InitiateCheckout", {
                    contents: items.map((i) => ({
                      content_id: i.product.id, content_type: "product",
                      content_name: i.product.name, price: i.product.price, num_items: i.quantity,
                    })),
                    value: totalPrice,
                    currency: "PKR",
                  });
                  setStep("checkout");
                }}
                className="btn-primary w-full"
              >
                Proceed to Order
              </button>
            </div>
          </>
        )}

        {/* Checkout step */}
        {items.length > 0 && step === "checkout" && (
          <>
            <div className="px-6 pt-3 pb-2">
              <button
                onClick={() => setStep("cart")}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                ← Back to cart
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto px-6 pb-6 space-y-4"
              noValidate
            >
              {/* Order summary mini */}
              <div className="py-3 border-b border-gray-100 space-y-1.5">
                {items.map((i) => (
                  <div key={i.product.id} className="flex justify-between text-xs text-gray-500">
                    <span>{i.product.name} × {i.quantity}</span>
                    <span>PKR {(i.product.price * i.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>PKR {totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ali Hassan"
                  className={`input-field ${errors.name ? "border-red-300 focus:ring-red-400" : ""}`}
                  {...register("name", {
                    required: "Name is required",
                    minLength: { value: 3, message: "At least 3 characters" },
                  })}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
                  Phone <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  className={`input-field ${errors.phone ? "border-red-300 focus:ring-red-400" : ""}`}
                  {...register("phone", {
                    required: "Phone is required",
                    pattern: {
                      value: /^(\+92|0092|0)?[3][0-9]{9}$/,
                      message: "Enter a valid Pakistani number",
                    },
                  })}
                />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
                  Delivery Address <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="House no., street, area, mohalla…"
                  className={`input-field resize-none ${errors.address ? "border-red-300 focus:ring-red-400" : ""}`}
                  {...register("address", { required: "Address is required", minLength: { value: 5, message: "Please enter your address" } })}
                />
                {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
                  City <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karachi, Lahore, Peshawar…"
                  className={`input-field ${errors.city ? "border-red-300 focus:ring-red-400" : ""}`}
                  {...register("city", { required: "City is required" })}
                />
                {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city.message}</p>}
              </div>

              <button
                type="submit"
                id="cart-place-order-btn"
                disabled={loading}
                className="btn-primary w-full mt-2"
              >
                {loading ? "Placing Order…" : "Place Order — Cash on Delivery"}
              </button>
              <p className="text-[11px] text-center text-gray-400">
                Pay cash when your order arrives. No advance payment.
              </p>
            </form>
          </>
        )}
      </div>
    </>
  );
}
