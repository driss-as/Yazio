import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { PREMIUM_ENTITLEMENT_ID } from "../_shared/revenuecat.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REVENUECAT_WEBHOOK_AUTH_TOKEN = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_TOKEN");

// Event types after which the entitlement is definitely granted or renewed.
const GRANTING_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
  "TRANSFER",
]);

// CANCELLATION only turns off auto-renew — access continues until EXPIRATION.
const REVOKING_EVENTS = new Set(["EXPIRATION"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  if (!REVENUECAT_WEBHOOK_AUTH_TOKEN) {
    console.error("Missing REVENUECAT_WEBHOOK_AUTH_TOKEN secret");
    return jsonResponse({ error: "Webhook not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH_TOKEN}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const payload = await req.json().catch(() => null);
  const event = payload?.event;
  const appUserId: string | undefined = event?.app_user_id;
  const eventType: string | undefined = event?.type;

  if (!appUserId || !eventType) {
    return jsonResponse({ error: "Malformed event" }, 400);
  }

  const entitlementIds: string[] =
    event?.entitlement_ids ?? (event?.entitlement_id ? [event.entitlement_id] : []);

  if (!entitlementIds.includes(PREMIUM_ENTITLEMENT_ID)) {
    return jsonResponse({ ok: true, ignored: "not the premium entitlement" });
  }

  let isPremium: boolean | null = null;
  if (GRANTING_EVENTS.has(eventType)) isPremium = true;
  else if (REVOKING_EVENTS.has(eventType)) isPremium = false;

  if (isPremium === null) {
    return jsonResponse({ ok: true, ignored: `event type ${eventType} does not change access` });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: appUserId, is_premium: isPremium, updated_at: new Date().toISOString() });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ ok: true });
});
