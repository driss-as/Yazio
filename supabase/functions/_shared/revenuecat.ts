const REVENUECAT_SECRET_API_KEY = Deno.env.get("REVENUECAT_SECRET_API_KEY");
export const PREMIUM_ENTITLEMENT_ID = "premium";

export async function hasActivePremiumEntitlement(appUserId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET_API_KEY) {
    console.error("Missing REVENUECAT_SECRET_API_KEY secret");
    return false;
  }

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` } },
  );

  if (!res.ok) {
    // A subscriber RevenueCat has never seen before can 404.
    return false;
  }

  const json = await res.json();
  const entitlement = json?.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT_ID];

  if (!entitlement) return false;
  if (!entitlement.expires_date) return true;

  return new Date(entitlement.expires_date).getTime() > Date.now();
}
