import type { Metadata } from "next";
import { Check } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { ToastCard } from "@/components/ui/toast";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm, type LoginMode } from "./login-form";

export const metadata: Metadata = { title: "Entrar — Vektra" };

const ERRORS: Record<string, string> = {
  suspenso: "Sua conta está suspensa. Fale com o suporte.",
  link: "Link inválido ou expirado. Tente novamente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pick = (key: string): string | undefined => (typeof params[key] === "string" ? params[key] : undefined);
  const erro = pick("erro");

  if (isSupabaseConfigured() && erro !== "suspenso") {
    const session = await getSession();
    if (session && session.profile.status === "ativo") redirect(session.profile.role === "admin" ? "/admin" : "/painel");
  }

  const modo = pick("modo");
  const initialMode: LoginMode = modo === "criar" || modo === "teste" ? "criar" : "entrar";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-12">
          <LoginForm initialMode={initialMode} next={pick("next")} notice={erro ? ERRORS[erro] : undefined} />
        </div>
        <p className="text-[12px] text-subtle">© 2026 Vektra</p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line bg-[#0d1119] lg:block">
        <div className="grid-backdrop absolute inset-0" />
        <div className="absolute top-[12%] left-[10%] size-[420px] rounded-full bg-blue/15 blur-[120px]" />
        <div className="absolute right-[5%] bottom-[10%] size-[380px] rounded-full bg-purple/20 blur-[120px]" />
        <div className="absolute right-[30%] bottom-[35%] size-[220px] rounded-full bg-pink/10 blur-[100px]" />

        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <p className="max-w-[440px] text-[34px] leading-[1.12] font-bold tracking-[-0.03em] text-balance">
            Seu próximo projeto começa <span className="text-gradient-flow">sem esperar o limite.</span>
          </p>
          <ul className="mt-8 space-y-3 text-[14.5px] text-fg/85">
            {["Pagamento por PIX, sem cartão", "Teste grátis de 3 dias no cadastro", "Suporte em português"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex size-5 items-center justify-center rounded-full bg-green/15 text-green">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-12 max-w-[380px] space-y-3">
            <ToastCard type="success" title="Pagamento confirmado" description="Sua licença Pro foi ativada." />
            <ToastCard type="info" title="Nova indicação" description="Alguém criou conta com seu link." className="ml-8 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
}
