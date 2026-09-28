"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, MailCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, type ActionState } from "@/components/ui/action-button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { requestPasswordReset, signIn, signUp } from "./actions";

export type LoginMode = "entrar" | "criar";
type View = LoginMode | "recuperar" | "confirmar";
type FormState = { name: string; email: string; password: string };

const COPY: Record<View, { title: string; subtitle: string }> = {
  entrar: { title: "Acesse sua conta", subtitle: "Entre para gerenciar licenças, pagamentos e parcerias." },
  criar: { title: "Crie sua conta", subtitle: "Ganhe 3 dias de teste grátis. Sem cartão." },
  recuperar: { title: "Recuperar senha", subtitle: "Enviaremos um link para você criar uma nova senha." },
  confirmar: { title: "Confira seu e-mail", subtitle: "Enviamos um link de confirmação. Depois é só entrar." },
};

export function LoginForm({ initialMode, next, notice }: { initialMode: LoginMode; next?: string; notice?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState<View>(initialMode);
  const [showPass, setShowPass] = useState(false);
  const [state, setState] = useState<ActionState>("idle");
  const [form, setForm] = useState<FormState>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const fail = (title: string, description: string) => {
    setState("error");
    toast({ type: "error", title, description });
    window.setTimeout(() => setState("idle"), 1500);
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (view === "criar" && form.name.trim().split(/\s+/).length < 2) next.name = "Informe nome e sobrenome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Digite um e-mail válido.";
    if (view !== "recuperar" && form.password.length < 8) next.password = "A senha precisa ter pelo menos 8 caracteres.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (state === "loading") return;
    if (!validate()) return fail("Revise seus dados", "Alguns campos precisam de atenção.");
    setState("loading");

    if (view === "recuperar") {
      const res = await requestPasswordReset(form.email);
      if (!res.ok) return fail("Não foi possível enviar", res.error);
      setState("success");
      toast({ type: "info", title: "Verifique seu e-mail", description: "Se houver conta com esse e-mail, o link chega em instantes." });
      window.setTimeout(() => {
        setState("idle");
        setView("entrar");
      }, 1200);
      return;
    }

    if (view === "criar") {
      const res = await signUp({ fullName: form.name, email: form.email, password: form.password });
      if (!res.ok) return fail("Não foi possível criar a conta", res.error);
      setState("success");
      if ("confirmEmail" in res.data) {
        setView("confirmar");
        setState("idle");
        return;
      }
      toast({ type: "success", title: "Conta criada", description: "Seu teste grátis de 3 dias já está ativo." });
      router.replace(res.data.redirectTo);
      router.refresh();
      return;
    }

    const res = await signIn({ email: form.email, password: form.password, next });
    if (!res.ok) return fail("Não foi possível entrar", res.error);
    setState("success");
    toast({ type: "success", title: "Bem-vindo de volta!", description: "Abrindo seu painel..." });
    router.replace(res.data.redirectTo);
    router.refresh();
  };

  const copy = COPY[view];

  return (
    <div className="w-full max-w-[400px]">
      {(view === "recuperar" || view === "confirmar") && (
        <button
          type="button"
          onClick={() => setView("entrar")}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
      )}
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">{copy.title}</h1>
      <p className="mt-2 text-[14.5px] text-muted">{copy.subtitle}</p>

      {notice && (
        <p role="alert" className="mt-5 rounded-xl border border-red/25 bg-red/[0.07] px-4 py-3 text-[13px] text-red">
          {notice}
        </p>
      )}

      {view === "confirmar" ? (
        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-line bg-card p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green/15 text-green">
            <MailCheck className="size-5" />
          </span>
          <p className="text-[13.5px] leading-relaxed text-muted">
            Abra o e-mail enviado para <span className="font-semibold text-fg">{form.email}</span> e clique no link para ativar
            sua conta.
          </p>
        </div>
      ) : (
        <>
          {view !== "recuperar" && (
            <Segmented<LoginMode>
              ariaLabel="Modo de acesso"
              value={view}
              onChange={(m) => {
                setView(m);
                setErrors({});
              }}
              className="mt-7 w-full"
              options={[
                { value: "entrar", label: "Entrar" },
                { value: "criar", label: "Criar conta" },
              ]}
            />
          )}

          <form
            className="mt-6 space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <AnimatePresence initial={false}>
              {view === "criar" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <Field label="Nome completo" htmlFor="lg-name" error={errors.name}>
                    <Input
                      id="lg-name"
                      autoComplete="name"
                      leading={<User className="size-4" />}
                      value={form.name}
                      invalid={!!errors.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>
            <Field label="E-mail" htmlFor="lg-email" error={errors.email}>
              <Input
                id="lg-email"
                type="email"
                autoComplete="email"
                leading={<Mail className="size-4" />}
                value={form.email}
                invalid={!!errors.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            {view !== "recuperar" && (
              <Field label="Senha" htmlFor="lg-pass" error={errors.password}>
                <div className="relative">
                  <Input
                    id="lg-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete={view === "criar" ? "new-password" : "current-password"}
                    leading={<Lock className="size-4" />}
                    value={form.password}
                    invalid={!!errors.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:text-fg"
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
            )}

            {view === "entrar" && (
              <div className="flex justify-end text-[13px]">
                <button
                  type="button"
                  className="font-medium text-cyan hover:underline"
                  onClick={() => {
                    setErrors({});
                    setView("recuperar");
                  }}
                >
                  Esqueci a senha
                </button>
              </div>
            )}

            <div className="pt-2">
              <ActionButton
                type="submit"
                state={state}
                icon={<ArrowRight className="size-[18px]" />}
                loadingText={view === "criar" ? "Criando conta..." : view === "recuperar" ? "Enviando..." : "Entrando..."}
                successText={view === "criar" ? "Conta criada" : view === "recuperar" ? "Link enviado" : "Tudo certo"}
                errorText="Tente novamente"
              >
                {view === "criar" ? "Criar conta e começar teste" : view === "recuperar" ? "Enviar link" : "Entrar no painel"}
              </ActionButton>
            </div>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-[13px] text-muted">
        Ainda não conhece?{" "}
        <Link href="/#planos" className="font-semibold text-fg hover:underline">
          Ver planos
        </Link>
      </p>
    </div>
  );
}
