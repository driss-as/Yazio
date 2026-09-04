import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import {
  getPremiumPlans,
  isPremiumPurchaseSupported,
  purchasePremiumPlan,
  type PremiumPlan,
} from '@/lib/revenuecat';

export function usePremiumOffering() {
  const { session } = useAuth();
  const appUserId = session?.user.id ?? null;

  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingKey, setPurchasingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appUserId) return;

    setLoading(true);
    setError(null);

    try {
      const fetchedPlans = await getPremiumPlans(appUserId);
      setPlans(fetchedPlans);
      if (isPremiumPurchaseSupported && fetchedPlans.length === 0) {
        setError('Aucune offre disponible pour le moment.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les tarifs.');
    } finally {
      setLoading(false);
    }
  }, [appUserId]);

  useEffect(() => {
    load();
  }, [load]);

  async function purchase(plan: PremiumPlan) {
    if (!appUserId) {
      return { error: 'Vous devez être connecté pour vous abonner.' };
    }

    setPurchasingKey(plan.packageIdentifier);
    const result = await purchasePremiumPlan(appUserId, plan);
    setPurchasingKey(null);
    return result;
  }

  return {
    supported: isPremiumPurchaseSupported,
    plans,
    loading,
    error,
    purchasingKey,
    purchase,
    refresh: load,
  };
}
