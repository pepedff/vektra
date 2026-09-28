export type AiConfig = {
  assistantName: string;
  welcomeMessage: string;
  chatPlaceholder: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  contextLimit: number;
  timeoutMs: number;
  allowAttachments: boolean;
  allowImages: boolean;
  allowCode: boolean;
  allowFileEdit: boolean;
  allowProjectRead: boolean;
};

export const DEFAULT_AI: AiConfig = {
  assistantName: "Assistente",
  welcomeMessage: "Olá! Estou pronta para ajudar no seu projeto na Lovable.",
  chatPlaceholder: "Escreva uma mensagem…",
  model: "gpt-4o-mini",
  systemPrompt: "Você é a assistente da extensão. Ajude o usuário dentro da Lovable, com respostas objetivas.",
  temperature: 0.7,
  contextLimit: 8000,
  timeoutMs: 30000,
  allowAttachments: true,
  allowImages: true,
  allowCode: true,
  allowFileEdit: true,
  allowProjectRead: true,
};

export function mergeAi(base: AiConfig, override: Partial<AiConfig> | null): AiConfig {
  if (!override) return base;
  return { ...base, ...override };
}
