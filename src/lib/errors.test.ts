import { describe, expect, it } from "vitest";
import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("traduz códigos lançados pelas funções SQL", () => {
    expect(friendlyError({ message: "invalid_coupon" })).toBe("Cupom inválido, expirado ou esgotado.");
    expect(friendlyError({ message: "forbidden", code: "42501" })).toBe("Você não tem permissão para isso.");
  });

  it("traduz violação de unicidade", () => {
    expect(friendlyError({ message: 'duplicate key value violates unique constraint "coupons_pkey"', code: "23505" })).toBe(
      "Já existe um registro com esse código.",
    );
  });

  it("não vaza mensagens internas desconhecidas", () => {
    expect(friendlyError({ message: "relation secret_table does not exist" })).toBe("Algo deu errado. Tente novamente.");
  });
});
