import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

const DEFAULTS = {
  heightCm: 178,
  startWeightKg: 85,
  currentWeightKg: 78.4,
  targetWeightKg: 72,
};

export type BodyMetrics = typeof DEFAULTS;

export function useBodyMetrics() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [metrics, setMetrics] = useState<BodyMetrics>(DEFAULTS);
  const [hasRecord, setHasRecord] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMetrics(DEFAULTS);
      setHasRecord(false);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('body_metrics')
      .select('height_cm, start_weight_kg, current_weight_kg, target_weight_kg')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setMetrics({
        heightCm: data.height_cm,
        startWeightKg: data.start_weight_kg,
        currentWeightKg: data.current_weight_kg,
        targetWeightKg: data.target_weight_kg,
      });
      setHasRecord(true);
    } else {
      setMetrics(DEFAULTS);
      setHasRecord(false);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (next: { heightCm: number; currentWeightKg: number; targetWeightKg: number }) => {
      if (!userId) return { error: 'You must be signed in.' };

      // Keep the original starting weight once set, so the progress ring
      // stays anchored to the user's first recorded weight.
      const startWeightKg = hasRecord ? metrics.startWeightKg : next.currentWeightKg;

      const { error } = await supabase.from('body_metrics').upsert({
        user_id: userId,
        height_cm: next.heightCm,
        start_weight_kg: startWeightKg,
        current_weight_kg: next.currentWeightKg,
        target_weight_kg: next.targetWeightKg,
        updated_at: new Date().toISOString(),
      });

      if (error) return { error: error.message };

      setMetrics({ ...next, startWeightKg });
      setHasRecord(true);
      return { error: null };
    },
    [userId, hasRecord, metrics.startWeightKg]
  );

  return { ...metrics, loading, save };
}
