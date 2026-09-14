// Minimal typing for the TikTok Pixel global (loaded via the inline snippet
// in app/layout.tsx). Only covers the methods this codebase actually calls —
// see lib/tiktok.ts, components/OrderForm.tsx, components/CartDrawer.tsx,
// and app/thankyou/page.tsx.
export interface TikTokPixel {
  track: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userData: { phone_number?: string; email?: string; external_id?: string }) => void;
  page: () => void;
}

declare global {
  interface Window {
    ttq?: TikTokPixel;
  }
}

export {};
