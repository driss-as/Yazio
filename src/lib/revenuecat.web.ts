import {
  ErrorCode,
  LogLevel,
  Purchases,
  PurchasesError,
  type Package as RcPackage,
  type Period,
} from '@revenuecat/purchases-js';

import type { PremiumPlan, PurchasePremiumResult } from './revenuecat.types';

export type { PremiumPlan, PurchasePremiumResult };

const REVENUECAT_WEB_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY;

export const isPremiumPurchaseSupported = true;

const packagesByIdentifier = new Map<string, RcPackage>();

function ensureConfigured(appUserId: string): Purchases {
  if (!REVENUECAT_WEB_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_REVENUECAT_WEB_API_KEY environment variable.');
  }
  if (Purchases.isConfigured()) {
    return Purchases.getSharedInstance();
  }
  Purchases.setLogLevel(LogLevel.Error);
  return Purchases.configure({ apiKey: REVENUECAT_WEB_API_KEY, appUserId });
}

function formatPeriod(period: Period | null): string {
  if (!period) return '';
  switch (period.unit) {
    case 'year':
      return period.number > 1 ? `/ ${period.number} ans` : '/ an';
    case 'month':
      return period.number > 1 ? `/ ${period.number} mois` : '/ mois';
    case 'week':
      return period.number > 1 ? `/ ${period.number} semaines` : '/ semaine';
    case 'day':
      return period.number > 1 ? `/ ${period.number} jours` : '/ jour';
    default:
      return '';
  }
}

export async function getPremiumPlans(appUserId: string): Promise<PremiumPlan[]> {
  const purchases = ensureConfigured(appUserId);
  const offerings = await purchases.getOfferings();
  const current = offerings.current;

  if (!current) {
    return [];
  }

  packagesByIdentifier.clear();

  return current.availablePackages.map((rcPackage) => {
    packagesByIdentifier.set(rcPackage.identifier, rcPackage);
    const product = rcPackage.webBillingProduct;

    return {
      packageIdentifier: rcPackage.identifier,
      productIdentifier: product.identifier,
      title: product.title,
      priceFormatted: product.price.formattedPrice,
      periodLabel: formatPeriod(product.period),
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
    const purchases = ensureConfigured(appUserId);
    await purchases.purchase({ rcPackage });
    return { error: null };
  } catch (err) {
    if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) {
      return { error: null, cancelled: true };
    }
    const message =
      err instanceof Error ? err.message : 'Une erreur est survenue pendant le paiement.';
    return { error: message };
  }
}
