import { useCallback, useEffect, useState } from 'react';

import type { MealType } from '@/components/add-food-entry-sheet';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

const DEFAULT_GOALS = {
  calorieGoal: 2000,
  carbsGoalG: 230,
  proteinGoalG: 115,
  fatGoalG: 65,
};

const EMPTY_MEAL_TOTALS: Record<MealType, number> = {
  breakfast: 0,
  lunch: 0,
  dinner: 0,
  snack: 0,
};

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function useNutritionTracker() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [proteinG, setProteinG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [mealTotals, setMealTotals] = useState<Record<MealType, number>>(EMPTY_MEAL_TOTALS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGoals(DEFAULT_GOALS);
      setCaloriesEaten(0);
      setCarbsG(0);
      setProteinG(0);
      setFatG(0);
      setMealTotals(EMPTY_MEAL_TOTALS);
      setLoading(false);
      return;
    }

    const date = todayIso();

    const [{ data: goalRow }, { data: dailyRow }, { data: mealRows }] = await Promise.all([
      supabase
        .from('nutrition_goals')
        .select('calorie_goal, carbs_goal_g, protein_goal_g, fat_goal_g')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('nutrition_daily_totals')
        .select('total_calories, total_carbs_g, total_protein_g, total_fat_g')
        .eq('user_id', userId)
        .eq('logged_date', date)
        .maybeSingle(),
      supabase
        .from('nutrition_meal_totals')
        .select('meal_type, total_calories')
        .eq('user_id', userId)
        .eq('logged_date', date),
    ]);

    setGoals({
      calorieGoal: goalRow?.calorie_goal ?? DEFAULT_GOALS.calorieGoal,
      carbsGoalG: goalRow?.carbs_goal_g ?? DEFAULT_GOALS.carbsGoalG,
      proteinGoalG: goalRow?.protein_goal_g ?? DEFAULT_GOALS.proteinGoalG,
      fatGoalG: goalRow?.fat_goal_g ?? DEFAULT_GOALS.fatGoalG,
    });
    setCaloriesEaten(Math.round(dailyRow?.total_calories ?? 0));
    setCarbsG(Math.round(dailyRow?.total_carbs_g ?? 0));
    setProteinG(Math.round(dailyRow?.total_protein_g ?? 0));
    setFatG(Math.round(dailyRow?.total_fat_g ?? 0));

    const nextMealTotals = { ...EMPTY_MEAL_TOTALS };
    for (const row of mealRows ?? []) {
      nextMealTotals[row.meal_type as MealType] = Math.round(row.total_calories);
    }
    setMealTotals(nextMealTotals);

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveGoals = useCallback(
    async (next: {
      calorieGoal: number;
      carbsGoalG: number;
      proteinGoalG: number;
      fatGoalG: number;
    }) => {
      if (!userId) return { error: 'You must be signed in.' };

      const { error } = await supabase.from('nutrition_goals').upsert({
        user_id: userId,
        calorie_goal: next.calorieGoal,
        carbs_goal_g: next.carbsGoalG,
        protein_goal_g: next.proteinGoalG,
        fat_goal_g: next.fatGoalG,
        updated_at: new Date().toISOString(),
      });

      if (error) return { error: error.message };

      setGoals(next);
      return { error: null };
    },
    [userId]
  );

  return {
    loading,
    calorieGoal: goals.calorieGoal,
    caloriesEaten,
    carbs: { value: carbsG, goal: goals.carbsGoalG },
    protein: { value: proteinG, goal: goals.proteinGoalG },
    fat: { value: fatG, goal: goals.fatGoalG },
    mealTotals,
    refresh,
    saveGoals,
  };
}
