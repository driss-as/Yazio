export type PremiumPlan = {
  packageIdentifier: string;
  productIdentifier: string;
  title: string;
  priceFormatted: string;
  periodLabel: string;
};

export type PurchasePremiumResult = {
  error: string | null;
  cancelled?: boolean;
};
