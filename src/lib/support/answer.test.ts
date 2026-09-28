import { describe, expect, it } from "vitest";
import { ARTICLES } from "./knowledge";
import { reply } from "./answer";

describe("reply", () => {
  it("explica o download da extensão", () => {
    const out = reply("como baixo a extensao", ARTICLES);
    expect(out.title).toMatch(/Download/i);
    expect(out.text).toMatch(/licença/i);
  });

  it("explica a confirmação manual do PIX", () => {
    const out = reply("ja paguei o pix e nao liberou", ARTICLES);
    expect(out.text).toMatch(/confirma/i);
  });

  it("não inventa resposta fora da base", () => {
    const out = reply("qual a capital da franca", ARTICLES);
    expect(out.title).toBeUndefined();
    expect(out.text).toMatch(/suporte@vektra.com.br/);
  });
});
