"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { sha256, trackEvent } from "@/lib/tiktok";
import { Variant } from "@/data/catalog";

interface OrderFormProps {
  productId: string;
  // Catalog group id — the price actually charged is recomputed
  // server-side from this, never trusted from the `price` prop below.
  groupId: string;
  productName: string;
  price: number;
  // Variant/color props — optional for backwards compat
  color?: string;
  variants?: Variant[];
  selectedVariantId?: string;
  onVariantChange?: (id: string) => void;
}

interface FormValues {
  name: string;
  phone: string;
  address: string;
  city: string;
  quantity: number;
}

export default function OrderForm({
  productId, groupId, productName, price,
  color, variants, selectedVariantId, onVariantChange,
}: OrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { quantity: 1 }, mode: "onTouched" });

  const quantity = watch("quantity") || 1;
  const total = price * quantity;

  // Derive the display label for the selected color
  const selectedVariant = variants?.find(v => v.id === selectedVariantId);
  const colorLabel = selectedVariant?.name ?? color ?? null;

  // Keep the effective product name in sync when color changes
  const effectiveName = colorLabel
    ? productName.includes("—")
      ? productName // already includes variant name
      : `${productName} — ${colorLabel}`
    : productName;

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);

    try {
      const { submitOrder } = await import("@/lib/orders");
      const { orderId, price: confirmedPrice } = await submitOrder({
        groupId,
        variantId: selectedVariantId ?? "",
        name: data.name.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        quantity: Number(data.quantity),
      });
      const confirmedTotal = confirmedPrice * quantity;

      const hashedPhone = await sha256(data.phone.trim());
      if (typeof window !== "undefined" && window.ttq) {
        window.ttq.identify({ phone_number: hashedPhone });
      }
      const contents = [{
        content_id: productId,
        content_type: "product",
        content_name: effectiveName,
        price: confirmedPrice,
        num_items: quantity,
      }];
      const userData = { phone: hashedPhone };
      await trackEvent("InitiateCheckout", { contents, value: confirmedTotal, currency: "PKR" }, userData);
      await trackEvent("PlaceAnOrder",     { contents, value: confirmedTotal, currency: "PKR" }, userData);
      await trackEvent("Purchase",         { contents, value: confirmedTotal, currency: "PKR" }, userData);

      setSubmitted(true);

      const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "923000000000";
      const msg = encodeURIComponent(
        `Assalam o Alaikum! I just placed a COD order for *${effectiveName}* (Qty: ${quantity}) — Rs. ${confirmedTotal.toLocaleString()}.\n\nName: ${data.name}\nPhone: ${data.phone}\n\nPlease confirm. 🙏`
      );

      router.push(`/thankyou?value=${confirmedTotal}&order_id=${orderId}`);
      setTimeout(() => window.open(`https://wa.me/${number}?text=${msg}`, "_blank"), 1200);
    } catch {
      setError("Something went wrong. Please try again or contact us on WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  const fc = (hasErr: boolean) =>
    `input-field ${hasErr ? "border-red-300 focus:ring-red-400" : ""}`;

  if (submitted) {
    return (
      <div className="py-10 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
        <p className="font-display text-xl font-semibold text-gray-900">Order Placed</p>
        <p className="text-sm text-gray-500">Redirecting you to confirm on WhatsApp…</p>
        <div className="flex items-center justify-center gap-2 text-green-600 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />Opening WhatsApp
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

      {/* Color selector — only shown when multiple variants exist */}
      {variants && variants.filter(v => !v.comingSoon).length > 1 && onVariantChange && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
            Color <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {variants.filter(v => !v.comingSoon).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onVariantChange(v.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  v.id === selectedVariantId
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/40 flex-shrink-0"
                  style={{ backgroundColor: v.swatch }}
                />
                {v.name}
              </button>
            ))}
          </div>
          {colorLabel && (
            <p className="text-xs text-gray-400 mt-1.5">
              Selected: <span className="font-medium text-gray-700">{colorLabel}</span>
            </p>
          )}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
          Full Name <span className="text-red-400">*</span>
        </label>
        <input type="text" placeholder="Ali Hassan" className={fc(!!errors.name)}
          {...register("name", { required: "Required", minLength: { value: 3, message: "Too short" } })}
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
          Phone <span className="text-red-400">*</span>
        </label>
        <input type="tel" placeholder="03XX-XXXXXXX" className={fc(!!errors.phone)}
          {...register("phone", {
            required: "Required",
            pattern: { value: /^(\+92|0092|0)?[3][0-9]{9}$/, message: "Enter a valid Pakistani number" },
          })}
        />
        {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
      </div>

      {/* Address */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
          Delivery Address <span className="text-red-400">*</span>
        </label>
        <textarea rows={3} placeholder="House no., street, area, mohalla…"
          className={`${fc(!!errors.address)} resize-none`}
          {...register("address", { required: "Address is required", minLength: { value: 5, message: "Please enter your address" } })}
        />
        {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
      </div>

      {/* City */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
          City <span className="text-red-400">*</span>
        </label>
        <input type="text" placeholder="e.g. Karachi, Lahore, Peshawar…"
          className={fc(!!errors.city)}
          {...register("city", { required: "City is required" })}
        />
        {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city.message}</p>}
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5 tracking-wide uppercase">
          Quantity
        </label>
        <input type="number" min={1} className="input-field"
          {...register("quantity", { valueAsNumber: true, min: 1 })}
        />
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-100 p-4 space-y-1.5 text-sm">
        {colorLabel && (
          <div className="flex justify-between text-gray-500">
            <span>Color</span>
            <span className="font-medium text-gray-700">{colorLabel}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-500">
          <span>Unit price</span>
          <span>PKR {price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Quantity</span>
          <span>× {quantity}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Delivery</span>
          <span className="text-green-600 font-medium">Free</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
          <span>Total (COD)</span>
          <span>PKR {total.toLocaleString()}</span>
        </div>
        <p className="text-xs text-gray-400 pt-1">Pay cash when your order arrives.</p>
      </div>

      {error && <p className="text-red-400 text-sm border border-red-100 bg-red-50 p-3">{error}</p>}

      <button
        type="submit"
        id="place-order-btn"
        disabled={loading}
        className="btn-primary w-full py-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
        ) : "Place Order — Cash on Delivery"}
      </button>

      <p className="text-center text-xs text-gray-400">
        Questions?{" "}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "923000000000"}`}
          target="_blank" rel="noopener noreferrer"
          className="text-green-600 hover:underline"
        >
          Chat on WhatsApp
        </a>
      </p>
    </form>
  );
}
