import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

const DEFAULT_GOAL_ML = 2500;

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function useWaterTracker() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [goalMl, setGoalMl] = useState(DEFAULT_GOAL_ML);
  const [consumedMl, setConsumedMl] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGoalMl(DEFAULT_GOAL_ML);
      setConsumedMl(0);
      setLoading(false);
      return;
    }

    const date = todayIso();

    const [{ data: goalRow }, { data: totalRow }] = await Promise.all([
      supabase.from('water_goals').select('daily_goal_ml').eq('user_id', userId).maybeSingle(),
      supabase
        .from('water_daily_totals')
        .select('total_ml')
        .eq('user_id', userId)
        .eq('logged_date', date)
        .maybeSingle(),
    ]);

    setGoalMl(goalRow?.daily_goal_ml ?? DEFAULT_GOAL_ML);
    setConsumedMl(totalRow?.total_ml ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addWater = useCallback(
    async (amountMl: number) => {
      if (!userId) return;

      setConsumedMl((current) => current + amountMl);

      const { error } = await supabase
        .from('water_logs')
        .insert({ user_id: userId, amount_ml: amountMl, logged_date: todayIso() });

      if (error) {
        setConsumedMl((current) => current - amountMl);
      }
    },
    [userId]
  );

  return { goalMl, consumedMl, loading, addWater };
}
