import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export function usePremiumStatus() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', userId)
      .maybeSingle();

    setIsPremium(data?.is_premium ?? false);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isPremium, loading, refresh };
}
