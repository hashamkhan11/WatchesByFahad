export async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getTtclid(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("ttclid") || "";
}

function getTtp(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/);
  return match ? match[1] : "";
}

export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown>,
  userData?: { phone?: string; external_id?: string }
) {
  const eventId = crypto.randomUUID();

  if (typeof window !== "undefined" && window.ttq) {
    window.ttq.track(eventName, { ...properties, event_id: eventId });
  }

  try {
    fetch("/.netlify/functions/tiktok-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: eventName,
        event_id: eventId,
        properties,
        user: {
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          ttclid: getTtclid(),
          ttp: getTtp(),
          ...userData,
        },
        url: typeof window !== "undefined" ? window.location.href : "",
      }),
    }).catch(() => {});
  } catch {}
}
