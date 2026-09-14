exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const pixelId = process.env.TIKTOK_PIXEL_ID;

  if (!accessToken || !pixelId) {
    return { statusCode: 500, body: "Missing TIKTOK env vars" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { event: eventName, event_id, properties, user, url } = body;

  const ip =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "";

  const userObj = {
    ip,
    user_agent: user?.user_agent || "",
    ...(user?.phone      && { phone:       user.phone }),
    ...(user?.external_id && { external_id: user.external_id }),
    ...(user?.ttclid     && { ttclid:      user.ttclid }),
    ...(user?.ttp        && { ttp:         user.ttp }),
  };

  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE;

  const payload = {
    pixel_code: pixelId,
    event_source_id: pixelId,
    event_source: "web",
    ...(testEventCode && { test_event_code: testEventCode }),
    data: [
      {
        event: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        user: userObj,
        properties: { ...properties, url: url || "" },
      },
    ],
  };

  try {
    const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    // Log only what's useful for debugging delivery — never the request/
    // response bodies themselves, which carry the customer's IP, hashed
    // phone, and other identifiers.
    console.log("TikTok event forwarded:", {
      event: eventName,
      event_id,
      status: res.status,
      code: data?.code,
      message: data?.message,
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true, tiktok: data }) };
  } catch (err) {
    console.error("TikTok event failed:", { event: eventName, event_id, error: String(err) });
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
