import { describe, expect, it } from "vitest";
import { buildPixPayload, crc16 } from "./pix";

describe("crc16 (CCITT-FALSE)", () => {
  it("bate com o valor de verificação padrão", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("buildPixPayload", () => {
  it("reproduz o exemplo do manual BR Code do BACEN", () => {
    expect(
      buildPixPayload({
        key: "123e4567-e12b-12d1-a456-426655440000",
        merchantName: "Fulano de Tal",
        merchantCity: "BRASILIA",
      }),
    ).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("inclui valor e txid e termina com CRC válido", () => {
    const payload = buildPixPayload({
      key: "pix@vektra.com.br",
      merchantName: "Vektra",
      merchantCity: "São Paulo",
      amountCents: 11990,
      txid: "VKTABC123",
    });
    expect(payload).toContain("5406119.90");
    expect(payload).toContain("6009Sao Paulo");
    expect(payload).toContain("62130509VKTABC123");
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("remove acentos e limita nome a 25 e cidade a 15 caracteres", () => {
    const payload = buildPixPayload({
      key: "k",
      merchantName: "Açaí & Companhia Limitada do Brasil",
      merchantCity: "São José dos Campos",
    });
    expect(payload).toContain("5925Acai Companhia Limitada d");
    expect(payload).toContain("6015Sao Jose dos Ca");
  });

  it("rejeita txid inválido e valor não positivo", () => {
    expect(() => buildPixPayload({ key: "k", merchantName: "A", merchantCity: "B", txid: "com espaço" })).toThrow();
    expect(() => buildPixPayload({ key: "k", merchantName: "A", merchantCity: "B", amountCents: 0 })).toThrow();
  });
});
