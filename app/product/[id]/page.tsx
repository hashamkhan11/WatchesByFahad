import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllProductRouteIds, getGroupById, LEGACY_REDIRECTS } from "@/data/catalog";
import LegacyRedirect from "./LegacyRedirect";
import ProductClient from "./ProductClient";

const BASE = "https://watchesbyfahad.com";

interface PageProps { params: { id: string } }

export function generateStaticParams() {
  return getAllProductRouteIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (LEGACY_REDIRECTS[params.id]) return { title: "WatchesByFahad" };

  const group = getGroupById(params.id);
  if (!group) return {};

  const canonical = `${BASE}/product/${group.id}/`;
  const allImages = group.variants
    .filter((v) => !v.comingSoon && v.images[0])
    .map((v) => ({ url: `${BASE}${v.images[0]}`, width: 900, height: 900 }));

  const title = `${group.fullName} — PKR ${group.price.toLocaleString()} | WatchesByFahad`;
  const description = `${group.shortDescription} Free Cash on Delivery across Pakistan — Karachi, Lahore, Islamabad & more.`;

  return {
    title,
    description,
    keywords: [
      `${group.name} watch pakistan`,
      `${group.fullName} price`,
      `${group.fullName} cod`,
      "watches pakistan cod",
      "buy watches online pakistan",
      "cash on delivery watches",
    ],
    alternates: { canonical },
    openGraph: {
      title: group.fullName,
      description,
      url: canonical,
      siteName: "WatchesByFahad",
      images: allImages.length ? allImages : [{ url: `${BASE}/og-image.jpg`, width: 1200, height: 630 }],
      locale: "en_PK",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: group.fullName,
      description,
      images: allImages[0] ? [allImages[0].url] : [`${BASE}/og-image.jpg`],
    },
  };
}

function ProductJsonLd({ params }: PageProps) {
  const group = getGroupById(params.id);
  if (!group) return null;

  const allImages = group.variants
    .filter((v) => !v.comingSoon && v.images[0])
    .map((v) => `${BASE}${v.images[0]}`);

  const priceValidUntil = `${new Date().getFullYear() + 1}-12-31`;

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: group.fullName,
    description: group.description,
    image: allImages,
    sku: group.id,
    brand: {
      "@type": "Brand",
      name: "WatchesByFahad",
    },
    offers: {
      "@type": "Offer",
      url: `${BASE}/product/${group.id}/`,
      priceCurrency: "PKR",
      price: group.price,
      priceValidUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "WatchesByFahad",
      },
    },
    ...(group.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: group.rating,
        reviewCount: group.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function ProductPage({ params }: PageProps) {
  if (LEGACY_REDIRECTS[params.id]) {
    return <LegacyRedirect to={LEGACY_REDIRECTS[params.id]} />;
  }

  const group = getGroupById(params.id);
  if (!group) notFound();

  if (group.comingSoon) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C4976A] mb-3">{group.categoryId.toUpperCase()}</p>
          <h1 className="font-display text-4xl font-semibold text-gray-900 mb-3">{group.name}</h1>
          <p className="text-gray-400 text-sm mb-8">We&apos;re finishing the photos. Check back soon.</p>
          <a href="/" className="btn-primary px-8 py-3 text-sm">Back to Collection</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProductJsonLd params={params} />
      <Suspense
        fallback={
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8 pb-28 md:pb-12">
            <div className="h-3 w-44 bg-gray-100 rounded animate-pulse mb-3 md:mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20">
              <div className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
              <div className="space-y-3 pt-1">
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded animate-pulse w-4/5" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-2/5" />
                <div className="h-8 bg-gray-100 rounded animate-pulse w-1/3" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                <div className="flex gap-3 pt-2">
                  <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
                  <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
                </div>
                <div className="h-44 bg-gray-100 rounded-2xl animate-pulse mt-2" />
                <div className="h-12 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        }
      >
        <ProductClient group={group} />
      </Suspense>
    </>
  );
}
