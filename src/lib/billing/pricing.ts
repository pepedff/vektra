/** Prévia de preço no navegador. O valor cobrado é sempre recalculado em public.create_order. */

export const RESELLER_UNIT_FACTOR = 0.7;

export type CouponQuote = { percentOff: number | null; amountOffCents: number | null };

export type Quote = { unitCents: number; subtotalCents: number; discountCents: number; totalCents: number };

export function quote({ priceCents, quantity, coupon }: { priceCents: number; quantity: number; coupon?: CouponQuote | null }): Quote {
  const unitCents = quantity > 1 ? Math.round(priceCents * RESELLER_UNIT_FACTOR) : priceCents;
  const subtotalCents = unitCents * quantity;
  let discountCents = 0;
  if (coupon) {
    discountCents = coupon.percentOff !== null ? Math.round((subtotalCents * coupon.percentOff) / 100) : (coupon.amountOffCents ?? 0);
    discountCents = Math.min(discountCents, subtotalCents - 1);
  }
  return { unitCents, subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}
