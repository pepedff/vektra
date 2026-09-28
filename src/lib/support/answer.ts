import type { Article } from "./knowledge";

const STOP = new Set(["que", "como", "para", "com", "uma", "nao", "por", "dos", "das", "meu", "minha", "voce", "essa", "esse", "isso", "the", "and"]);

export function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOP.has(word))
    .map((word) => (word.startsWith("baix") ? "baixar" : word));
}

export function reply(question: string, articles: Article[]): { title?: string; text: string } {
  const query = tokenize(question);
  if (query.length === 0) return { text: "Escreva a dúvida em uma frase." };

  let best: Article | undefined;
  let bestScore = 0;
  for (const article of articles) {
    const title = new Set(tokenize(article.title));
    const body = new Set(tokenize(article.body));
    let score = 0;
    for (const term of query) {
      if (title.has(term)) score += 3;
      else if (body.has(term)) score += 1;
    }
    if (score > bestScore) {
      best = article;
      bestScore = score;
    }
  }

  if (!best || bestScore < 2) {
    return { text: "Não achei isso na base de suporte. Escreva para suporte@vektra.com.br." };
  }
  return { title: best.title, text: best.body };
}
