import { describe, expect, it } from "vitest";
import { effectiveStatus } from "./license";

const now = new Date("2026-09-26T12:00:00Z");

describe("effectiveStatus", () => {
  it("revogada prevalece", () => {
    expect(effectiveStatus({ status: "revogada", expires_at: "2027-01-01T00:00:00Z" }, now)).toBe("revogada");
  });

  it("vencida vira expirado", () => {
    expect(effectiveStatus({ status: "ativo", expires_at: "2026-09-26T11:59:59Z" }, now)).toBe("expirado");
    expect(effectiveStatus({ status: "teste", expires_at: "2026-09-01T00:00:00Z" }, now)).toBe("expirado");
  });

  it("mantém ativo e teste dentro da validade", () => {
    expect(effectiveStatus({ status: "ativo", expires_at: "2026-10-26T00:00:00Z" }, now)).toBe("ativo");
    expect(effectiveStatus({ status: "teste", expires_at: "2026-09-28T00:00:00Z" }, now)).toBe("teste");
  });
});
