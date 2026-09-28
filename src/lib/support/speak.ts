export const SYSTEM_PROMPT =
  "Você é a assistente de suporte da Vektra. Responda em português do Brasil, em no máximo 3 frases, usando somente o trecho enviado. Se o trecho não responder a pergunta, diga apenas: Não achei isso na base de suporte. Escreva para suporte@vektra.com.br.";

export function isModelEcho(text: string): boolean {
  return text.includes("On-device model is not available") || text.includes("Trecho de suporte:");
}

export function groundedPrompt(question: string, context: string): string {
  return `Trecho de suporte:\n${context}\n\nPergunta do cliente:\n${question}`;
}

/** O Chrome às vezes manda o texto inteiro de novo; outras vezes, só o pedaço novo. */
export function applyChunk(current: string, chunk: string): string {
  if (!chunk) return current;
  if (chunk.startsWith(current)) return chunk;
  return current + chunk;
}

export async function readModelStream(
  source: AsyncIterable<string>,
  onText: (text: string) => void,
): Promise<string> {
  let text = "";
  for await (const chunk of source) {
    text = applyChunk(text, String(chunk));
    onText(text);
  }
  return text;
}

export type ModelPhase =
  | { kind: "boot" }
  | { kind: "download"; pct: number }
  | { kind: "ready" }
  | { kind: "base" };

export function phaseLabel(phase: ModelPhase): string {
  if (phase.kind === "boot") return "Preparando a IA…";
  if (phase.kind === "download") return `Baixando a IA… ${phase.pct}%`;
  if (phase.kind === "ready") return "IA pronta";
  return "IA indisponível neste navegador";
}
