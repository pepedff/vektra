import { describe, expect, it } from "vitest";
import { applyChunk, groundedPrompt, isModelEcho, phaseLabel, readModelStream } from "./speak";

describe("groundedPrompt", () => {
  it("prende a pergunta ao trecho da base", () => {
    const prompt = groundedPrompt("como baixo", "Baixe no painel.");
    expect(prompt).toContain("como baixo");
    expect(prompt).toContain("Baixe no painel.");
  });
});

describe("isModelEcho", () => {
  it("reconhece o eco do Chromium sem modelo", () => {
    expect(isModelEcho("On-device model is not available in Chromium, this API is just echoing back the input: Trecho de suporte:")).toBe(true);
    expect(isModelEcho("Abra o painel em Download e baixe o arquivo.")).toBe(false);
  });
});

describe("applyChunk", () => {
  it("acumula pedaços e também aceita o texto completo repetido", () => {
    expect(applyChunk("Olá", " Olá")).toBe("Olá Olá");
    expect(applyChunk("Olá", "Olá, tudo bem")).toBe("Olá, tudo bem");
  });
});

describe("readModelStream", () => {
  it("entrega o texto conforme os pedaços chegam", async () => {
    async function* chunks() {
      yield "Com ";
      yield "Com uma licença";
    }
    const seen: string[] = [];
    const full = await readModelStream(chunks(), (text) => seen.push(text));
    expect(seen).toEqual(["Com ", "Com uma licença"]);
    expect(full).toBe("Com uma licença");
  });
});

describe("phaseLabel", () => {
  it("mostra o download e o modelo pronto", () => {
    expect(phaseLabel({ kind: "download", pct: 40 })).toBe("Baixando a IA… 40%");
    expect(phaseLabel({ kind: "ready" })).toBe("IA pronta");
  });
});
