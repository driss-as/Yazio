import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export type FoodItem = {
  id: string;
  created_by: string | null;
  name: string;
  brand: string | null;
  calories_per_100g: number;
  carbs_g_per_100g: number;
  protein_g_per_100g: number;
  fat_g_per_100g: number;
  default_serving_g: number | null;
};

export type NewFoodInput = {
  name: string;
  brand: string;
  caloriesPer100g: number;
  carbsGPer100g: number;
  proteinGPer100g: number;
  fatGPer100g: number;
  defaultServingG: number | null;
};

export function useFoodCatalog() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    async (search: string) => {
      setLoading(true);
      let request = supabase
        .from('foods')
        .select(
          'id, created_by, name, brand, calories_per_100g, carbs_g_per_100g, protein_g_per_100g, fat_g_per_100g, default_serving_g'
        )
        .order('name', { ascending: true });

      if (search.trim()) {
        request = request.ilike('name', `%${search.trim()}%`);
      }

      const { data } = await request;
      setFoods(data ?? []);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    refresh(query);
  }, [refresh, query]);

  const addFood = useCallback(
    async (input: NewFoodInput) => {
      if (!userId) return { error: 'You must be signed in.' };

      const { error } = await supabase.from('foods').insert({
        created_by: userId,
        name: input.name,
        brand: input.brand || null,
        calories_per_100g: input.caloriesPer100g,
        carbs_g_per_100g: input.carbsGPer100g,
        protein_g_per_100g: input.proteinGPer100g,
        fat_g_per_100g: input.fatGPer100g,
        default_serving_g: input.defaultServingG,
      });

      if (error) return { error: error.message };

      await refresh(query);
      return { error: null };
    },
    [userId, query, refresh]
  );

  const deleteFood = useCallback(
    async (id: string) => {
      setFoods((current) => current.filter((food) => food.id !== id));
      await supabase.from('foods').delete().eq('id', id);
    },
    []
  );

  return {
    foods,
    loading,
    query,
    setQuery,
    addFood,
    deleteFood,
    userId,
  };
}
