import QRCode from "qrcode";
import { buildPixPayload } from "@/lib/billing/pix";
import type { Order } from "@/lib/supabase/types";

export type PixCharge = { payload: string; qrDataUrl: string };

function pixConfig(): { key: string; merchantName: string; merchantCity: string } {
  const key = process.env.PIX_KEY;
  const merchantName = process.env.PIX_MERCHANT_NAME;
  const merchantCity = process.env.PIX_MERCHANT_CITY;
  if (!key || !merchantName || !merchantCity) {
    throw new Error("PIX não configurado: defina PIX_KEY, PIX_MERCHANT_NAME e PIX_MERCHANT_CITY");
  }
  return { key, merchantName, merchantCity };
}

export type StoreStatus = { pixConfigured: boolean; pixKeyHint: string | null; merchantName: string | null };

/** Só expõe uma dica mascarada da chave, nunca o valor completo. */
export function storeStatus(): StoreStatus {
  const key = process.env.PIX_KEY ?? "";
  const configured = Boolean(key && process.env.PIX_MERCHANT_NAME && process.env.PIX_MERCHANT_CITY);
  return {
    pixConfigured: configured,
    pixKeyHint: configured ? `${key.slice(0, 3)}•••${key.slice(-2)}` : null,
    merchantName: configured ? (process.env.PIX_MERCHANT_NAME ?? null) : null,
  };
}

export async function pixForOrder(order: Pick<Order, "amount_cents" | "pix_txid">): Promise<PixCharge> {
  const payload = buildPixPayload({ ...pixConfig(), amountCents: order.amount_cents, txid: order.pix_txid });
  const qrDataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 1, width: 360 });
  return { payload, qrDataUrl };
}
