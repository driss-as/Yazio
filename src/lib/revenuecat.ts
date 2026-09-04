import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';

import type { PremiumPlan, PurchasePremiumResult } from './revenuecat.types';

export type { PremiumPlan, PurchasePremiumResult };

const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

export const isPremiumPurchaseSupported = Platform.OS === 'ios' && !!REVENUECAT_IOS_API_KEY;

const packagesByIdentifier = new Map<string, PurchasesPackage>();

let configuredAppUserId: string | null = null;

function ensureConfigured(appUserId: string) {
  if (Platform.OS !== 'ios') {
    throw new Error("L'achat Premium n'est disponible que sur iOS pour le moment.");
  }
  if (!REVENUECAT_IOS_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_REVENUECAT_IOS_API_KEY environment variable.');
  }
  if (configuredAppUserId === appUserId) return;

  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY, appUserID: appUserId });
  configuredAppUserId = appUserId;
}

function formatPeriod(period: string | null): string {
  if (!period) return '';
  const match = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(period);
  if (!match) return '';
  const [, years, months, weeks, days] = match;

  if (years) return Number(years) > 1 ? `/ ${years} ans` : '/ an';
  if (months) return Number(months) > 1 ? `/ ${months} mois` : '/ mois';
  if (weeks) return Number(weeks) > 1 ? `/ ${weeks} semaines` : '/ semaine';
  if (days) return Number(days) > 1 ? `/ ${days} jours` : '/ jour';
  return '';
}

export async function getPremiumPlans(appUserId: string): Promise<PremiumPlan[]> {
  ensureConfigured(appUserId);

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;

  if (!current) {
    return [];
  }

  packagesByIdentifier.clear();

  return current.availablePackages.map((rcPackage) => {
    packagesByIdentifier.set(rcPackage.identifier, rcPackage);
    const product = rcPackage.product;

    return {
      packageIdentifier: rcPackage.identifier,
      productIdentifier: product.identifier,
      title: product.title,
      priceFormatted: product.priceString,
      periodLabel: formatPeriod(product.subscriptionPeriod),
    };
  });
}

export async function purchasePremiumPlan(
  appUserId: string,
  plan: PremiumPlan
): Promise<PurchasePremiumResult> {
  const rcPackage = packagesByIdentifier.get(plan.packageIdentifier);

  if (!rcPackage) {
    return { error: 'Ce forfait n’est plus disponible, veuillez rafraîchir la page.' };
  }

  try {
    ensureConfigured(appUserId);
    await Purchases.purchasePackage(rcPackage);
    return { error: null };
  } catch (err: any) {
    if (err?.userCancelled) {
      return { error: null, cancelled: true };
    }
    const message =
      err instanceof Error ? err.message : 'Une erreur est survenue pendant le paiement.';
    return { error: message };
  }
}
