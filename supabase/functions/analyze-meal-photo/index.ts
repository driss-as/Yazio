import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OPENAI_MODEL = "gpt-4o-mini";
const BUCKET = "meal-photos";
const SIGNED_URL_TTL_SECONDS = 5 * 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const NUTRITION_SCHEMA = {
  name: "meal_nutrition",
  strict: true,
  schema: {
    type: "object",
    properties: {
      dish_name: { type: "string", description: "Short name of the dish, e.g. 'Grilled chicken salad'" },
      estimated_quantity_g: { type: "number", description: "Estimated total plate weight in grams" },
      calories: { type: "number", description: "Estimated total calories (kcal)" },
      carbs_g: { type: "number", description: "Estimated total carbohydrates in grams" },
      protein_g: { type: "number", description: "Estimated total protein in grams" },
      fat_g: { type: "number", description: "Estimated total fat in grams" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      notes: { type: "string", description: "Short caveat about the estimate, or empty string" },
    },
    required: [
      "dish_name",
      "estimated_quantity_g",
      "calories",
      "carbs_g",
      "protein_g",
      "fat_g",
      "confidence",
      "notes",
    ],
    additionalProperties: false,
  },
} as const;

type NutritionEstimate = {
  dish_name: string;
  estimated_quantity_g: number;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
  notes: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  if (!OPENAI_API_KEY) {
    return jsonResponse({ error: "Missing OPENAI_API_KEY secret" }, 500);
  }

  let photoPath: string | undefined;
  try {
    const body = await req.json();
    photoPath = typeof body?.photoPath === "string" ? body.photoPath : undefined;
  } catch {
    // ignore, handled below
  }

  if (!photoPath) {
    return jsonResponse({ error: "Missing photoPath" }, 400);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();

  if (userError || !userData?.user) {
    return jsonResponse({ error: "Not authenticated" }, 401);
  }

  const { data: profile } = await callerClient
    .from("profiles")
    .select("is_premium")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!profile?.is_premium) {
    return jsonResponse(
      { error: "Meal photo analysis is a Premium feature", code: "premium_required" },
      402,
    );
  }

  if (!photoPath.startsWith(`${userData.user.id}/`)) {
    return jsonResponse({ error: "You don't have access to this photo" }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS);

  if (signedUrlError || !signedUrlData) {
    return jsonResponse({ error: signedUrlError?.message ?? "Could not access photo" }, 404);
  }

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a nutrition estimation assistant. Look at the photo of a meal and estimate its " +
            "nutritional content as best you can. Always return a best-effort numeric estimate, even if " +
            "the photo is ambiguous — never refuse. Use the notes field for caveats.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Estimate the nutrition for the meal in this photo." },
            { type: "image_url", image_url: { url: signedUrlData.signedUrl } },
          ],
        },
      ],
      response_format: { type: "json_schema", json_schema: NUTRITION_SCHEMA },
    }),
  });

  if (!openaiRes.ok) {
    const errorText = await openaiRes.text();
    return jsonResponse({ error: `OpenAI request failed: ${errorText}` }, 502);
  }

  const openaiJson = await openaiRes.json();
  const rawContent = openaiJson?.choices?.[0]?.message?.content;

  if (typeof rawContent !== "string") {
    return jsonResponse({ error: "Unexpected response from OpenAI" }, 502);
  }

  const estimate = JSON.parse(rawContent) as NutritionEstimate;

  return jsonResponse({ estimate });
});
