import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FATSECRET_CONSUMER_KEY = Deno.env.get("FATSECRET_CONSUMER_KEY");
const FATSECRET_CONSUMER_SECRET = Deno.env.get("FATSECRET_CONSUMER_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FATSECRET_BASE_URL = "https://platform.fatsecret.com/rest/server.api";

const DEFAULT_QUERIES = [
  "chicken salad",
  "vegetable soup",
  "beef stew",
  "pancakes",
  "grilled salmon",
  "vegetable stir fry",
  "spaghetti bolognese",
  "chicken curry",
  "banana bread",
  "quinoa salad",
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

type RecipeSummary = {
  recipe_id: string;
  recipe_name: string;
};

async function searchRecipe(query: string): Promise<RecipeSummary | null> {
  const data = await signedRequest({
    method: "recipes.search.v3",
    search_expression: query,
    format: "json",
    max_results: "1",
  });
  const recipes = data?.recipes?.recipe;
  if (!recipes) return null;
  const list: RecipeSummary[] = Array.isArray(recipes) ? recipes : [recipes];
  return list[0] ?? null;
}

type Ingredient = {
  food_name?: string;
  number_of_units?: string;
  measurement_description?: string;
  ingredient_description?: string;
};

type Direction = {
  direction_number?: string;
  direction_description?: string;
};

type ServingSize = {
  calories?: string;
  carbohydrate?: string;
  protein?: string;
  fat?: string;
};

type RecipeDetail = {
  recipe_id: string;
  recipe_name: string;
  recipe_description?: string;
  number_of_servings?: string;
  preparation_time_min?: string;
  cooking_time_min?: string;
  recipe_images?: { recipe_image?: string | string[] };
  serving_sizes?: { serving?: ServingSize | ServingSize[] };
  ingredients?: { ingredient?: Ingredient | Ingredient[] };
  directions?: { direction?: Direction | Direction[] };
};

async function getRecipeDetail(recipeId: string): Promise<RecipeDetail | null> {
  const data = await signedRequest({
    method: "recipe.get.v2",
    recipe_id: recipeId,
    format: "json",
  });
  return data?.recipe ?? null;
}

function firstImage(images: RecipeDetail["recipe_images"]) {
  const image = images?.recipe_image;
  if (!image) return null;
  return Array.isArray(image) ? image[0] : image;
}

function firstServing(servings: RecipeDetail["serving_sizes"]) {
  const serving = servings?.serving;
  if (!serving) return null;
  return Array.isArray(serving) ? serving[0] : serving;
}

function toList<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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
      const found = await searchRecipe(query);
      if (!found) {
        skipped.push(`${query} (no match)`);
        continue;
      }

      const { data: existing } = await supabase
        .from("recipes")
        .select("id")
        .is("created_by", null)
        .eq("fatsecret_recipe_id", found.recipe_id)
        .maybeSingle();

      if (existing) {
        skipped.push(`${found.recipe_name} (already in database)`);
        continue;
      }

      const detail = await getRecipeDetail(found.recipe_id);
      if (!detail) {
        skipped.push(`${query} (no detail)`);
        continue;
      }

      const serving = firstServing(detail.serving_sizes);
      if (!serving) {
        skipped.push(`${detail.recipe_name} (no nutrition data)`);
        continue;
      }

      const ingredients = toList(detail.ingredients?.ingredient).map((ingredient) => ({
        name: ingredient.food_name ?? null,
        amount: ingredient.number_of_units ?? null,
        unit: ingredient.measurement_description ?? null,
        description: ingredient.ingredient_description ?? null,
      }));

      const directions = toList(detail.directions?.direction)
        .map((direction) => ({
          step: direction.direction_number ? Number(direction.direction_number) : null,
          description: direction.direction_description ?? null,
        }))
        .sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

      const { error } = await supabase.from("recipes").insert({
        created_by: null,
        fatsecret_recipe_id: detail.recipe_id,
        name: detail.recipe_name,
        description: detail.recipe_description ?? null,
        image_url: firstImage(detail.recipe_images),
        servings: detail.number_of_servings ? Number(detail.number_of_servings) : null,
        prep_time_min: detail.preparation_time_min ? Number(detail.preparation_time_min) : null,
        cook_time_min: detail.cooking_time_min ? Number(detail.cooking_time_min) : null,
        calories_per_serving: Math.round(Number(serving.calories ?? 0) * 10) / 10,
        carbs_g_per_serving: Math.round(Number(serving.carbohydrate ?? 0) * 10) / 10,
        protein_g_per_serving: Math.round(Number(serving.protein ?? 0) * 10) / 10,
        fat_g_per_serving: Math.round(Number(serving.fat ?? 0) * 10) / 10,
        ingredients,
        directions,
      });

      if (error) {
        skipped.push(`${detail.recipe_name} (${error.message})`);
        continue;
      }

      imported.push(detail.recipe_name);
    } catch (err) {
      skipped.push(`${query} (${err instanceof Error ? err.message : "error"})`);
    }
  }

  return new Response(JSON.stringify({ imported, skipped }), {
    headers: { "Content-Type": "application/json" },
  });
});
