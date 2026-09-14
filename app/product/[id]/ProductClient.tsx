"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Shield, Truck, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductGroup, Variant, getVariant, getGroupById, catalog } from "@/data/catalog";
import { trackEvent } from "@/lib/tiktok";
import { useCart } from "@/context/CartContext";
import OrderForm from "@/components/OrderForm";
import ReviewsSection from "@/components/ReviewsSection";
import SocialProof from "@/components/SocialProof";
import StickyOrderBar from "@/components/StickyOrderBar";
import { ShoppingBag, Check } from "lucide-react";

// ── Badge styles ──────────────────────────────────────────────────────────────

const badgeStyle: Record<string, string> = {
  "Eid Sale":       "border-amber-500 text-amber-800",
  "Best Seller":    "border-amber-400 text-amber-700",
  "New Arrival":    "border-blue-400 text-blue-700",
  "Premium Pick":   "border-purple-400 text-purple-700",
  "Formal Pick":    "border-gray-600 text-gray-700",
  "Most Exclusive": "border-gray-900 text-gray-900",
};

// ── Image Gallery (inline, variant-aware) ─────────────────────────────────────

function VariantGallery({ group, selectedVariantId, onVariantChange }: {
  group: ProductGroup;
  selectedVariantId: string;
  onVariantChange: (id: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const variant = group.variants.find((v) => v.id === selectedVariantId) ?? group.variants[0];
  const images = variant.images;
  const selectableVariants = group.variants.filter((v) => !v.comingSoon && v.images[0]);
  const jumpToIndexRef = useRef(0);

  // On variant change, jump to the index set by prev/next (defaults to 0)
  useEffect(() => {
    setActiveIndex(jumpToIndexRef.current);
    jumpToIndexRef.current = 0;
  }, [selectedVariantId]);

  const next = () => {
    if (activeIndex < images.length - 1) {
      setActiveIndex((i) => i + 1);
    } else if (selectableVariants.length > 1) {
      const idx = selectableVariants.findIndex((v) => v.id === selectedVariantId);
      onVariantChange(selectableVariants[(idx + 1) % selectableVariants.length].id);
    }
  };

  const prev = () => {
    if (activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    } else if (selectableVariants.length > 1) {
      const idx = selectableVariants.findIndex((v) => v.id === selectedVariantId);
      const prevVariant = selectableVariants[(idx - 1 + selectableVariants.length) % selectableVariants.length];
      jumpToIndexRef.current = prevVariant.images.length - 1;
      onVariantChange(prevVariant.id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    dx < 0 ? next() : prev();
  };

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* All variant first images pre-rendered — color switch is pure CSS opacity, no remount */}
        {group.variants
          .filter((v) => !v.comingSoon && v.images[0])
          .map((v) => (
            <Image
              key={v.id}
              src={v.images[0]}
              alt={`${group.fullName} — ${v.name}`}
              fill
              priority={v.id === group.defaultVariant}
              loading={v.id === group.defaultVariant ? "eager" : "lazy"}
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`object-contain p-4 transition-opacity duration-150 ${
                v.id === selectedVariantId && activeIndex === 0 ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

        {/* Additional images of the active variant (index 1, 2, 3…) */}
        {images.slice(1).map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${variant.name} — view ${i + 2}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`object-contain p-4 transition-opacity duration-150 ${
              activeIndex === i + 1 ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Eid Sale badge */}
        <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 bg-[#3D1F0F] text-[#F5C98A] text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full shadow-md">
          ☪ Eid ul Azha Sale
        </span>

        {(images.length > 1 || selectableVariants.length > 1) && (
          <>
            <button onClick={prev} aria-label="Previous"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button onClick={next} aria-label="Next"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={() => setActiveIndex(i)} aria-label={`View image ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === activeIndex ? "bg-gray-900 w-4" : "bg-gray-400/60 w-2"}`}
            />
          ))}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((src, i) => (
            <button key={i} onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIndex ? "border-gray-900" : "border-gray-100 hover:border-gray-300"
              }`}
            >
              <Image src={src} alt={`Thumbnail ${i + 1}`} fill sizes="80px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Color Swatch Selector ─────────────────────────────────────────────────────

function ColorSelector({ variants, selected, onChange }: {
  variants: Variant[];
  selected: string;
  onChange: (id: string) => void;
}) {
  const [soonFlash, setSoonFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSoonClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSoonFlash(true);
    timerRef.current = setTimeout(() => setSoonFlash(false), 2000);
  };

  if (variants.length <= 1) return null;

  const hasSoon = variants.some(v => v.comingSoon);

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.15em] mb-3">
        Color — <span className="text-gray-900 normal-case tracking-normal">
          {variants.find(v => v.id === selected)?.name}
        </span>
      </p>
      <div className="flex gap-3 flex-wrap items-center">
        {variants.map((v) =>
          v.comingSoon ? (
            <button
              key={v.id}
              type="button"
              aria-label={`${v.name} — Coming Soon`}
              onClick={handleSoonClick}
              className={`w-9 h-9 rounded-full opacity-30 cursor-not-allowed ring-1 ring-gray-200 hover:opacity-50 transition-opacity ${v.swatchBorder ? "ring-gray-300" : ""}`}
              style={{ backgroundColor: v.swatch }}
            />
          ) : (
            <button
              key={v.id}
              onClick={() => onChange(v.id)}
              title={v.name}
              className={`w-9 h-9 rounded-full transition-all ring-offset-2 focus:outline-none ${
                v.id === selected
                  ? "ring-2 ring-gray-900 scale-110"
                  : "ring-1 ring-gray-200 hover:ring-gray-400"
              }`}
              style={{ backgroundColor: v.swatch }}
              aria-label={v.name}
              aria-pressed={v.id === selected}
            />
          )
        )}
      </div>
      {hasSoon && (
        <p className={`text-xs mt-2.5 transition-colors ${soonFlash ? "text-amber-500 font-medium" : "text-gray-400"}`}>
          {soonFlash ? "Coming Soon" : "More colors coming soon"}
        </p>
      )}
    </div>
  );
}

// ── Cross-sell: all other product groups ─────────────────────────────────────

function CrossSell({ currentGroupId }: { currentGroupId: string }) {
  const items = catalog.flatMap((c) =>
    c.groups.flatMap((group) =>
      group.id === currentGroupId
        ? []
        : group.variants
            .filter((v) => !v.comingSoon && (v.cardImage ?? v.images[0]))
            .map((v) => ({ group, variant: v }))
    )
  );

  if (items.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.15em] mb-4">
        You may also like
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(({ group, variant: v }) => {
          const image = v.cardImage ?? v.images[0];
          const discount = Math.round(
            ((group.originalPrice - group.price) / group.originalPrice) * 100
          );

          return (
            <a
              key={`${group.id}-${v.id}`}
              href={`/product/${group.id}/?color=${v.id}`}
              className="group flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-300 transition-colors"
            >
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {image && (
                  <Image
                    src={image}
                    alt={`${group.fullName} — ${v.name}`}
                    fill
                    sizes="(max-width: 768px) 44vw, 25vw"
                    className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
                <span className="absolute top-2 right-2 bg-black text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  −{discount}%
                </span>
              </div>
              <div className="p-2.5 flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-1">
                  {v.name}
                </p>
                <p className="text-[10px] text-gray-400 line-clamp-1">{group.fullName}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xs font-semibold text-gray-900">
                    PKR {group.price.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400 line-through">
                    {group.originalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProductClient({ group }: { group: ProductGroup }) {
  const searchParams = useSearchParams();

  // Resolve initial color from URL param, fallback to default
  const initialColor = searchParams.get("color") ?? group.defaultVariant;
  const [selectedVariantId, setSelectedVariantId] = useState(
    group.variants.find(v => v.id === initialColor)
      ? initialColor
      : group.defaultVariant
  );

  const variant = getVariant(group, selectedVariantId);
  const discount = Math.round(((group.originalPrice - group.price) / group.originalPrice) * 100);
  const { addItem } = useCart();
  const [cartAdded, setCartAdded] = useState(false);

  const addToCart = useCallback(() => {
    // Build a Product-compatible object for the cart
    addItem({
      id: `${group.id}-${variant.id}`,
      groupId: group.id,
      variantId: variant.id,
      name: `${group.fullName} — ${variant.name}`,
      price: group.price,
      originalPrice: group.originalPrice,
      images: variant.images,
      shortDescription: group.shortDescription,
      description: group.description,
      features: group.features,
      badge: variant.badge,
      stock: 99,
      orders24h: group.orders24h,
      rating: group.rating,
      reviewCount: group.reviewCount,
    });
    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2000);
  }, [addItem, group, variant]);

  // Sync URL param when color changes (keeps TikTok pixel URL accurate)
  // Uses history.replaceState directly to avoid triggering a Next.js navigation
  // (router.replace causes a server re-render that resets state)
  const handleColorChange = useCallback((variantId: string) => {
    setSelectedVariantId(variantId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("color", variantId);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Fire TikTok ViewContent on mount and on color change
  useEffect(() => {
    trackEvent("ViewContent", {
      contents: [{
        content_id: `${group.id}-${variant.id}`,
        content_type: "product",
        content_name: `${group.fullName} — ${variant.name}`,
        price: group.price,
        num_items: 1,
      }],
      value: group.price,
      currency: "PKR",
    });
  }, [group, variant]);

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-28 md:pb-12">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-3 md:mb-6 tracking-wide" aria-label="Breadcrumb">
          <a href="/" className="hover:text-gray-700 transition-colors">Home</a>
          <span className="mx-2">/</span>
          <span className="text-gray-600 uppercase tracking-wider text-[10px]">{group.categoryId}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{group.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20">
          {/* Images — sticky on desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <VariantGallery group={group} selectedVariantId={selectedVariantId} onVariantChange={handleColorChange} />
            {/* Color selector shown right below image on mobile — no scroll needed */}
            <div className="mt-2 lg:hidden">
              <ColorSelector
                variants={group.variants}
                selected={selectedVariantId}
                onChange={handleColorChange}
              />
            </div>
          </div>

          {/* Info */}
          <div>
            {(group.badge ?? variant.badge) && (
              <span className={`tag mb-2 md:mb-4 ${badgeStyle[group.badge ?? variant.badge ?? ""] ?? "border-gray-300 text-gray-500"}`}>
                {group.badge ?? variant.badge}
              </span>
            )}

            <h1 className="font-display text-3xl md:text-5xl font-semibold text-gray-900 leading-tight mb-0.5">
              {group.fullName}
            </h1>
            <p className="text-sm text-gray-500 mb-2 md:mb-4">{variant.name}</p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3 md:mb-5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={`w-3.5 h-3.5 ${i < Math.floor(group.rating) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {group.rating.toFixed(1)} · {group.reviewCount} reviews
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="font-display text-3xl font-semibold text-gray-900">
                PKR {group.price.toLocaleString()}
              </span>
              <span className="text-base text-gray-400 line-through">
                {group.originalPrice.toLocaleString()}
              </span>
              <span className="tag-sale">−{discount}%</span>
            </div>
            <p className="text-xs text-green-600 font-medium mb-3 md:mb-5">
              Pay cash on delivery — no advance required
            </p>

            {/* Color selector — desktop only; mobile version lives below the gallery */}
            <div className="hidden lg:block">
              <ColorSelector
                variants={group.variants}
                selected={selectedVariantId}
                onChange={handleColorChange}
              />
            </div>

            <SocialProof stock={99} />

            {/* CTA buttons */}
            <div className="flex gap-3 mb-4 md:mb-8">
              <button
                onClick={addToCart}
                className="btn-outline flex-1 flex items-center justify-center gap-2"
              >
                {cartAdded ? (
                  <><Check className="w-4 h-4" /> Added</>
                ) : (
                  <><ShoppingBag className="w-4 h-4" strokeWidth={1.5} /> Add to Cart</>
                )}
              </button>
              <a href="#order-form" className="btn-primary flex-1">
                Order Now
              </a>
            </div>

            {/* Order form */}
            <div id="order-form" className="mb-6 md:mb-10 border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 bg-white">
              <h2 className="font-display text-xl md:text-2xl font-semibold text-gray-900 mb-0.5">
                Order via this page
              </h2>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Fill in your details. We deliver to your door and you pay cash on arrival.
              </p>
              <OrderForm
                productId={`${group.id}-${variant.id}`}
                groupId={group.id}
                productName={`${group.fullName} — ${variant.name}`}
                price={group.price}
                color={variant.name}
                variants={group.variants}
                selectedVariantId={selectedVariantId}
                onVariantChange={handleColorChange}
              />
            </div>

            {/* Description */}
            <div className="mb-8 pt-8 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-[0.15em] mb-4">About this watch</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{group.description}</p>
            </div>

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-[0.15em] mb-4">Specifications</h3>
              <ul className="space-y-2.5">
                {group.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-b border-gray-100 mb-8">
              {[
                { icon: Truck,     label: "Free Delivery", sub: "All Pakistan" },
                { icon: Shield,    label: "COD Only",      sub: "Pay on arrival" },
                { icon: RotateCcw, label: "7-Day Return",  sub: "Easy process" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="text-center">
                  <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1.5" strokeWidth={1.5} />
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                  <p className="text-[11px] text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            <CrossSell currentGroupId={group.id} />

            <ReviewsSection />
          </div>
        </div>
      </div>

      <StickyOrderBar
        price={group.price}
        productName={`${group.fullName} — ${variant.name}`}
      />
    </>
  );
}
