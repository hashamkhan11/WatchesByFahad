"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

function ThankYouContent() {
  const params = useSearchParams();
  const value    = params.get("value") || "0";
  const orderId  = params.get("order_id") || "";

  useEffect(() => {
    // PlaceAnOrder + Purchase already fired in the order form before redirect
    // Fire ttq.page() to register the thank-you page view
    if (typeof window !== "undefined" && (window as any).ttq) {
      (window as any).ttq.page();
    }
  }, [value, orderId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-14 h-14 bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-green-500" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <div>
          <h1 className="font-display text-4xl font-semibold text-gray-900 mb-2">
            Order Received
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Thank you for your order. We&apos;ll confirm everything on WhatsApp shortly and get it delivered to your door.
          </p>
        </div>

        {/* Order value */}
        {parseFloat(value) > 0 && (
          <div className="bg-gray-50 border border-gray-100 py-4 px-6 inline-block w-full">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Order Total</p>
            <p className="font-display text-2xl font-semibold text-gray-900">
              PKR {parseFloat(value).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Cash on Delivery</p>
          </div>
        )}

        {/* What's next */}
        <div className="text-left space-y-3 py-2">
          {[
            "You'll receive a WhatsApp confirmation shortly.",
            "Your order will be dispatched within 3–5 business days.",
            "Pay cash when it arrives at your door.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-500">
              <span className="w-5 h-5 bg-gray-100 flex items-center justify-center text-[11px] font-medium text-gray-500 flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/" className="btn-outline flex-1">
            Continue Shopping
          </Link>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "923000000000"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp flex-1"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
