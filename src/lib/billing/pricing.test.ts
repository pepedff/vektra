import { describe, expect, it } from "vitest";
import { quote } from "./pricing";

describe("quote (espelha public.create_order)", () => {
  it("preço cheio para uma unidade", () => {
    expect(quote({ priceCents: 11990, quantity: 1 })).toEqual({ unitCents: 11990, subtotalCents: 11990, discountCents: 0, totalCents: 11990 });
  });

  it("30% off por unidade em pacotes", () => {
    expect(quote({ priceCents: 4990, quantity: 10 })).toMatchObject({ unitCents: 3493, totalCents: 34930 });
  });

  it("cupom percentual", () => {
    expect(quote({ priceCents: 11990, quantity: 1, coupon: { percentOff: 10, amountOffCents: null } })).toMatchObject({
      discountCents: 1199,
      totalCents: 10791,
    });
  });

  it("cupom de valor nunca zera o pedido", () => {
    expect(quote({ priceCents: 4990, quantity: 1, coupon: { percentOff: null, amountOffCents: 10000 } })).toMatchObject({
      discountCents: 4989,
      totalCents: 1,
    });
  });
});
