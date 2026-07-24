/**
 * Emulated wallet / platform credits (not e-money).
 * Customers buy credits; Stripe settles to the platform account.
 * UI may show EUR equivalents via formatEurFromCents.
 */

/** Default top-up pack: €5.00 = 500 cents = 500 credits */
export const CREDIT_PACK_CENTS = 500;

export const CREDIT_PACK_LABEL = "500 platform credits (€5,00)";

export function creditsFromCents(cents: number): number {
  // 1 credit = 1 euro-cent of purchasing power on SnapTask
  return cents;
}
