import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("aceita caminhos internos", () => {
    expect(safeNext("/admin/pedidos", "/painel")).toBe("/admin/pedidos");
  });

  it.each([null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "bloqueia %s",
    (value) => {
      expect(safeNext(value, "/painel")).toBe("/painel");
    },
  );
});
