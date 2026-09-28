import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Digite um e-mail válido.").max(254);
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");
export const fullNameSchema = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome.");

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72) });
export const signUpSchema = z.object({ fullName: fullNameSchema, email: emailSchema, password: passwordSchema });

export const uuidSchema = z.string().uuid();
export const planIdSchema = z.string().regex(/^[a-z0-9_-]{2,32}$/);
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,16}$/, "Use de 4 a 16 letras ou números.");

export const profileSchema = z.object({
  fullName: fullNameSchema,
  phone: z.string().trim().max(30).optional().default(""),
  pixKey: z.string().trim().max(120).optional().default(""),
});

export const createOrderSchema = z.object({
  planId: planIdSchema,
  quantity: z.number().int().min(1).max(100).default(1),
  coupon: z.union([couponCodeSchema, z.literal("")]).optional(),
});

export const couponSchema = z
  .object({
    code: couponCodeSchema,
    kind: z.enum(["percent", "amount"]),
    value: z.number().positive(),
    maxUses: z.number().int().min(1).max(100000),
    expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  })
  .refine((c) => c.kind === "amount" || c.value <= 100, { message: "Percentual máximo é 100.", path: ["value"] });

export const notificationSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto.").max(60),
  message: z.string().trim().min(5, "Mensagem muito curta.").max(180),
  type: z.enum(["info", "success", "warning", "error"]),
  audience: z.enum(["todos", "especificos", "plano", "ativos", "expirados"]),
  userIds: z.array(uuidSchema).max(500).default([]),
  planId: planIdSchema.optional(),
  pinned: z.boolean().default(false),
});

export const resellerMessageSchema = z.string().trim().min(10, "Conte um pouco mais (mínimo 10 caracteres).").max(500);
export const versionSchema = z.object({
  id: uuidSchema.optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Use o formato 1.0.0."),
  name: z.string().trim().min(2).max(80),
  changelog: z.string().trim().min(4).max(2000),
  mandatory: z.boolean().default(false),
});

const hex = z.string().regex(/^#([0-9a-fA-F]{6})$/, "Use uma cor hexadecimal.");
export const brandingSchema = z.object({
  extensionName: z.string().trim().min(2).max(40),
  assistantName: z.string().trim().min(2).max(40),
  logoUrl: z.string().url().max(500).nullable().optional(),
  iconUrl: z.string().url().max(500).nullable().optional(),
  colorPrimary: hex,
  colorSecondary: hex,
  gradient: z.string().trim().max(200),
  background: z.string().trim().max(80),
  cards: z.string().trim().max(80),
  inputs: z.string().trim().max(80),
  buttons: z.string().trim().max(80),
  sidebar: z.string().trim().max(80),
  chat: z.string().trim().max(80),
  font: z.string().trim().min(2).max(40),
  radius: z.number().int().min(0).max(32),
  glow: z.boolean(),
  theme: z.enum(["dark", "light"]),
  messages: z.string().trim().max(180),
  suggestions: z.array(z.string().trim().max(80)).max(8),
});

export const aiSchema = z.object({
  assistantName: z.string().trim().min(2).max(40),
  welcomeMessage: z.string().trim().min(4).max(240),
  chatPlaceholder: z.string().trim().min(2).max(80),
  model: z.string().trim().min(2).max(80),
  systemPrompt: z.string().trim().min(4).max(4000),
  temperature: z.number().min(0).max(2),
  contextLimit: z.number().int().min(512).max(200000),
  timeoutMs: z.number().int().min(1000).max(180000),
  allowAttachments: z.boolean(),
  allowImages: z.boolean(),
  allowCode: z.boolean(),
  allowFileEdit: z.boolean(),
  allowProjectRead: z.boolean(),
});

export const reservedLicenseSchema = z.object({
  email: emailSchema,
  planId: planIdSchema,
  days: z.number().int().min(1).max(3650),
});
