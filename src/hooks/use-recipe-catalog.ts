import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type RecipeIngredient = {
  name: string | null;
  amount: string | null;
  unit: string | null;
  description: string | null;
};

export type RecipeDirection = {
  step: number | null;
  description: string | null;
};

export type RecipeItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  servings: number | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  calories_per_serving: number;
  carbs_g_per_serving: number;
  protein_g_per_serving: number;
  fat_g_per_serving: number;
  ingredients: RecipeIngredient[];
  directions: RecipeDirection[];
};

export function useRecipeCatalog() {
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (search: string) => {
    setLoading(true);
    let request = supabase
      .from('recipes')
      .select(
        'id, name, description, image_url, servings, prep_time_min, cook_time_min, calories_per_serving, carbs_g_per_serving, protein_g_per_serving, fat_g_per_serving, ingredients, directions'
      )
      .order('name', { ascending: true });

    if (search.trim()) {
      request = request.ilike('name', `%${search.trim()}%`);
    }

    const { data } = await request;
    setRecipes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh(query);
  }, [refresh, query]);

  return {
    recipes,
    loading,
    query,
    setQuery,
  };
}
