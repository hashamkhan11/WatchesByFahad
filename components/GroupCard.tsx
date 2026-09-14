"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductGroup } from "@/data/catalog";
import { calculateDiscountPercent } from "@/lib/pricing";

const BADGE_STYLE: Record<string, string> = {
  "Eid Sale":       "border-amber-500 text-amber-800",
  "Best Seller":    "border-amber-400 text-amber-700",
  "New Arrival":    "border-blue-400 text-blue-700",
  "Premium Pick":   "border-purple-400 text-purple-700",
  "Formal Pick":    "border-gray-600 text-gray-700",
  "Most Exclusive": "border-gray-900 text-gray-900",
};

export default function GroupCard({
  group,
  priority,
}: {
  group: ProductGroup;
  priority?: boolean;
}) {
  const [activeId, setActiveId] = useState(group.defaultVariant);
  const [hoverPreviewId, setHoverPreviewId] = useState<string | null>(null);
  const [soonFlash, setSoonFlash] = useState(false);

  const handleSoonClick = () => {
    setSoonFlash(true);
    setTimeout(() => setSoonFlash(false), 2000);
  };

  const displayId = hoverPreviewId ?? activeId;
  const activeVariant =
    group.variants.find((v) => v.id === activeId) ?? group.variants[0];
  const displayVariant =
    group.variants.find((v) => v.id === displayId) ?? group.variants[0];

  const discount = calculateDiscountPercent(group.originalPrice, group.price);
  const href = `/product/${group.id}/?color=${activeId}`;
  const badge = group.badge ?? displayVariant?.badge;

  return (
    <div className="product-card group flex flex-col">
      {/* Image */}
      <Link href={href} className="relative block aspect-[4/5] bg-gray-50 overflow-hidden">
        {group.variants.map((v) =>
          (v.cardImage ?? v.images[0]) ? (
            <Image
              key={v.id}
              src={v.cardImage ?? v.images[0]}
              alt={`${group.fullName} — ${v.name}`}
              fill
              priority={priority && v.id === group.defaultVariant}
              loading={priority && v.id === group.defaultVariant ? "eager" : "lazy"}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className={`object-contain p-6 transition-all duration-200 group-hover:scale-[1.02] ${
                v.id === displayId ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null
        )}

        {badge && (
          <span
            className={`tag absolute top-3 left-3 bg-white/95 ${
              BADGE_STYLE[badge] ?? "border-gray-300 text-gray-600"
            }`}
          >
            {badge}
          </span>
        )}

        <span className="tag-sale absolute top-3 right-3">−{discount}%</span>
      </Link>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <Link href={href}>
          <h3 className="font-display text-[1.05rem] font-semibold text-gray-900 leading-snug group-hover:text-gray-600 transition-colors">
            {group.name}
          </h3>
        </Link>

        {/* Color swatches */}
        {group.variants.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              {group.variants.length > 1 ? "Pick Color" : "Color"}
            </span>
          <div className="flex items-center gap-2 flex-wrap">
            {group.variants.map((v) =>
              v.comingSoon ? (
                <button
                  key={v.id}
                  type="button"
                  aria-label={`${v.name} — Coming Soon`}
                  onClick={handleSoonClick}
                  className={`w-6 h-6 rounded-full border-2 border-white/70 flex-shrink-0 opacity-35 hover:opacity-60 transition-opacity ${v.swatchBorder ? "ring-1 ring-gray-200" : ""}`}
                  style={{ backgroundColor: v.swatch }}
                />
              ) : (
                <button
                  key={v.id}
                  title={v.name}
                  onMouseEnter={() => setHoverPreviewId(v.id)}
                  onMouseLeave={() => setHoverPreviewId(null)}
                  onClick={() => setActiveId(v.id)}
                  aria-label={v.name}
                  aria-pressed={v.id === activeId}
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${
                    v.id === activeId
                      ? "border-gray-900 scale-110"
                      : "border-white/70 shadow hover:border-gray-400"
                  } ${v.swatchBorder ? "ring-1 ring-gray-200" : ""}`}
                  style={{ backgroundColor: v.swatch }}
                />
              )
            )}
            <span className={`text-[10px] ml-0.5 transition-colors ${soonFlash ? "text-amber-500 font-medium" : "text-gray-500"}`}>
              {soonFlash ? "Coming Soon" : group.variants.some(v => v.comingSoon) ? `${activeVariant.name} · more soon` : activeVariant.name}
            </span>
          </div>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="font-display text-base font-semibold text-gray-900">
            PKR {group.price.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 line-through">
            {group.originalPrice.toLocaleString()}
          </span>
        </div>

        <Link href={href} className="btn-primary w-full py-3 text-[11px]">
          Order Now
        </Link>
      </div>
    </div>
  );
}
