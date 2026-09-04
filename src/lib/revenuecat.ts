import type { PremiumPlan, PurchasePremiumResult } from './revenuecat.types';

export type { PremiumPlan, PurchasePremiumResult };

// RevenueCat Web Billing (@revenuecat/purchases-js) only runs in a browser.
// This is the fallback used on iOS/Android until native store billing is wired up.
export const isPremiumPurchaseSupported = false;

export async function getPremiumPlans(_appUserId: string): Promise<PremiumPlan[]> {
  return [];
}

export async function purchasePremiumPlan(
  _appUserId: string,
  _plan: PremiumPlan
): Promise<PurchasePremiumResult> {
  return {
    error: "L'achat Premium n'est pas encore disponible depuis l'app mobile. Passez par yazio.app sur le web.",
  };
}
