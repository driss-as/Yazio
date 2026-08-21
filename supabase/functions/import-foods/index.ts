import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FATSECRET_CONSUMER_KEY = Deno.env.get("FATSECRET_CONSUMER_KEY");
const FATSECRET_CONSUMER_SECRET = Deno.env.get("FATSECRET_CONSUMER_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FATSECRET_BASE_URL = "https://platform.fatsecret.com/rest/server.api";

const DEFAULT_QUERIES = [
  "chicken breast",
  "white rice",
  "banana",
  "egg",
  "broccoli",
  "salmon",
  "oatmeal",
  "greek yogurt",
  "almonds",
  "sweet potato",
];

function percentEncode(str: string) {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

async function hmacSha1Base64(key: string, message: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function signedRequest(params: Record<string, string>) {
  const allParams: Record<string, string> = {
    ...params,
    oauth_consumer_key: FATSECRET_CONSUMER_KEY!,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };

  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const baseString = ["GET", percentEncode(FATSECRET_BASE_URL), percentEncode(paramString)].join("&");
  const signingKey = `${percentEncode(FATSECRET_CONSUMER_SECRET!)}&`;
  const signature = await hmacSha1Base64(signingKey, baseString);

  allParams.oauth_signature = signature;

  const finalParamString = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const res = await fetch(`${FATSECRET_BASE_URL}?${finalParamString}`);
  if (!res.ok) {
    throw new Error(`FatSecret request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

type FatSecretFoodSummary = {
  food_id: string;
  food_name: string;
  food_type: string;
};

async function searchFood(query: string): Promise<FatSecretFoodSummary | null> {
  const data = await signedRequest({
    method: "foods.search",
    search_expression: query,
    format: "json",
    max_results: "5",
  });
  const foods = data?.foods?.food;
  if (!foods) return null;
  const list: FatSecretFoodSummary[] = Array.isArray(foods) ? foods : [foods];
  return list.find((f) => f.food_type === "Generic") ?? list[0];
}

async function getFoodDetail(foodId: string) {
  const data = await signedRequest({
    method: "food.get.v4",
    food_id: foodId,
    format: "json",
  });
  return data?.food ?? null;
}

type Serving = {
  metric_serving_unit?: string;
  metric_serving_amount?: string;
  calories?: string;
  carbohydrate?: string;
  protein?: string;
  fat?: string;
};

function toPer100g(servings: Serving | Serving[] | undefined) {
  if (!servings) return null;
  const list = Array.isArray(servings) ? servings : [servings];

  let serving = list.find(
    (s) => s.metric_serving_unit === "g" && Number(s.metric_serving_amount) === 100
  );
  if (!serving) {
    serving = list.find((s) => s.metric_serving_unit === "g" && Number(s.metric_serving_amount) > 0);
  }
  if (!serving) return null;

  const grams = Number(serving.metric_serving_amount);
  const factor = 100 / grams;

  return {
    calories: Math.round(Number(serving.calories) * factor * 10) / 10,
    carbs: Math.round(Number(serving.carbohydrate ?? 0) * factor * 10) / 10,
    protein: Math.round(Number(serving.protein ?? 0) * factor * 10) / 10,
    fat: Math.round(Number(serving.fat ?? 0) * factor * 10) / 10,
    defaultServingG: grams === 100 ? null : grams,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!FATSECRET_CONSUMER_KEY || !FATSECRET_CONSUMER_SECRET) {
    return new Response(
      JSON.stringify({ error: "Missing FATSECRET_CONSUMER_KEY / FATSECRET_CONSUMER_SECRET secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let queries: string[] = DEFAULT_QUERIES;
  try {
    const body = await req.json();
    if (Array.isArray(body?.queries) && body.queries.length > 0) {
      queries = body.queries.filter((q: unknown) => typeof q === "string");
    }
  } catch {
    // no body provided, fall back to defaults
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const imported: string[] = [];
  const skipped: string[] = [];

  for (const query of queries) {
    try {
      const found = await searchFood(query);
      if (!found) {
        skipped.push(`${query} (no match)`);
        continue;
      }

      const detail = await getFoodDetail(found.food_id);
      if (!detail) {
        skipped.push(`${query} (no detail)`);
        continue;
      }

      const per100g = toPer100g(detail.servings?.serving);
      if (!per100g) {
        skipped.push(`${detail.food_name} (no per-100g serving)`);
        continue;
      }

      const { data: existing } = await supabase
        .from("foods")
        .select("id")
        .is("created_by", null)
        .ilike("name", detail.food_name)
        .maybeSingle();

      if (existing) {
        skipped.push(`${detail.food_name} (already in database)`);
        continue;
      }

      const { error } = await supabase.from("foods").insert({
        created_by: null,
        name: detail.food_name,
        brand: detail.brand_name ?? null,
        calories_per_100g: per100g.calories,
        carbs_g_per_100g: per100g.carbs,
        protein_g_per_100g: per100g.protein,
        fat_g_per_100g: per100g.fat,
        default_serving_g: per100g.defaultServingG,
      });

      if (error) {
        skipped.push(`${detail.food_name} (${error.message})`);
        continue;
      }

      imported.push(detail.food_name);
    } catch (err) {
      skipped.push(`${query} (${err instanceof Error ? err.message : "error"})`);
    }
  }

  return new Response(JSON.stringify({ imported, skipped }), {
    headers: { "Content-Type": "application/json" },
  });
});
