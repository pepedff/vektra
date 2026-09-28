"use client";

import { KeyRound, Laptop, Save, Settings, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useState } from "react";
import { updatePassword } from "@/app/login/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Panel } from "@/components/dashboard/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { formatDateTime } from "@/lib/format";
import type { LoginEvent, Profile, ResellerRequest } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { updateProfile } from "@/server/client-actions";
import { requestReseller } from "@/server/extension-actions";
import type { StoreStatus } from "@/server/pix";

type Tab = "perfil" | "seguranca" | "revenda";

function ProfilePanel({ profile, email }: { profile: Profile; email: string }) {
  const { run, pending } = useAction();
  const [form, setForm] = useState({ fullName: profile.full_name, phone: profile.phone ?? "", pixKey: profile.pix_key ?? "" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateProfile(form), { title: "Alterações salvas", description: "Seu perfil foi atualizado." });
      }}
    >
      <Panel title="Informações pessoais" description="Usadas em recibos e comunicações." bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="s1">
          <Input id="s1" autoComplete="name" maxLength={120} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="s2" hint="Para trocar o e-mail, fale com o suporte.">
          <Input id="s2" type="email" value={email} disabled />
        </Field>
        <Field label="Telefone" htmlFor="s3">
          <Input id="s3" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Chave PIX para saques" htmlFor="s4" hint="Usada para pagar suas comissões de afiliado.">
          <Input id="s4" maxLength={120} value={form.pixKey} onChange={(e) => setForm({ ...form, pixKey: e.target.value })} />
        </Field>
      </Panel>
      <div className="mt-5 flex justify-end">
        <Button type="submit" variant="action" loading={pending} icon={<Save className="size-4" />}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

function SecurityPanel({ logins }: { logins: LoginEvent[] }) {
  const { run, pending } = useAction();
  const [pass, setPass] = useState({ next: "", confirm: "" });
  const [error, setError] = useState<string>();

  const submit = () => {
    const problem = pass.next.length < 8 ? "A senha precisa ter pelo menos 8 caracteres." : pass.next !== pass.confirm ? "As senhas não conferem." : undefined;
    setError(problem);
    if (problem) return;
    run(() => updatePassword(pass.next), { title: "Senha alterada", description: "Use a nova senha no próximo acesso." }, () => setPass({ next: "", confirm: "" }));
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Panel title="Alterar senha" bodyClassName="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nova senha" htmlFor="p1" error={error}>
              <Input id="p1" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={pass.next} invalid={!!error} onChange={(e) => setPass({ ...pass, next: e.target.value })} />
            </Field>
            <Field label="Confirmar senha" htmlFor="p2">
              <Input id="p2" type="password" autoComplete="new-password" value={pass.confirm} onChange={(e) => setPass({ ...pass, confirm: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={pending} icon={<KeyRound className="size-4" />}>
              Alterar senha
            </Button>
          </div>
        </Panel>
      </form>
      <Panel title="Acessos recentes" description="Últimos logins na sua conta. Se não reconhecer algum, troque a senha." bodyClassName="divide-y divide-line">
        {logins.length === 0 && <p className="px-5 py-6 text-[13px] text-muted">Nenhum login registrado ainda.</p>}
        {logins.map((s, i) => {
          const mobile = /Mobile|Android|iPhone|iPad/i.test(s.user_agent ?? "");
          const Icon = mobile ? Smartphone : Laptop;
          return (
            <div key={s.id} className="flex items-center gap-3.5 px-5 py-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/[0.04] text-muted ring-1 ring-white/[0.06]">
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-medium">
                  {formatDateTime(s.created_at)} {i === 0 && <Badge tone="green">Mais recente</Badge>}
                </p>
                <p className="truncate text-[12.5px] text-muted">
                  {s.ip ?? "IP desconhecido"} · {s.user_agent ?? "Navegador desconhecido"}
                </p>
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

function StorePanel({ store }: { store: StoreStatus }) {
  return (
    <Panel title="Recebimento via PIX" description="Definido nas variáveis de ambiente do servidor (PIX_KEY, PIX_MERCHANT_NAME, PIX_MERCHANT_CITY)." bodyClassName="flex items-center gap-4 p-5">
      <span className="flex size-11 items-center justify-center rounded-xl bg-white/[0.04] text-muted ring-1 ring-white/[0.06]">
        <Wallet className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{store.pixConfigured ? store.merchantName : "PIX não configurado"}</p>
        <p className="text-[12.5px] text-muted">{store.pixConfigured ? `Chave ${store.pixKeyHint}` : "Clientes não conseguem gerar cobranças até você configurar."}</p>
      </div>
      <Badge tone={store.pixConfigured ? "green" : "red"}>{store.pixConfigured ? "ativo" : "pendente"}</Badge>
    </Panel>
  );
}

function ResellerPanel({ request, isReseller }: { request: ResellerRequest | null; isReseller: boolean }) {
  const { run, pending } = useAction();
  const [message, setMessage] = useState("");
  if (isReseller) {
    return <Panel bodyClassName="p-5 text-[13.5px] text-muted">Sua conta já está autorizada a revender. O menu Revenda aparece na barra lateral.</Panel>;
  }
  if (request?.status === "pendente") {
    return <Panel bodyClassName="p-5 text-[13.5px] text-muted">Seu pedido está em análise. Você será avisado quando o admin responder.</Panel>;
  }
  return (
    <Panel title="Quero revender" description="A área de revenda só aparece depois da aprovação." bodyClassName="space-y-4 p-5">
      <Field label="Por que você quer revender?" htmlFor="rmsg">
        <Input id="rmsg" value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder="Conte em poucas linhas." />
      </Field>
      <Button variant="action" loading={pending} disabled={message.trim().length < 10} onClick={() => run(() => requestReseller(message), { title: "Pedido enviado" })}>
        Enviar pedido
      </Button>
    </Panel>
  );
}

export function SettingsView({
  variant,
  profile,
  email,
  logins,
  store,
  resellerRequest,
}: {
  variant: "client" | "admin";
  profile: Profile;
  email: string;
  logins: LoginEvent[];
  store?: StoreStatus;
  resellerRequest?: ResellerRequest | null;
}) {
  const [tab, setTab] = useState<Tab>("perfil");
  const showResale = variant === "client";
  return (
    <>
      <PageHeader icon={variant === "admin" ? ShieldCheck : Settings} title="Configurações" description={variant === "admin" ? "Sua conta e o recebimento da loja." : "Perfil, segurança e pedido de revenda."} />
      {store && (
        <div className="mb-5">
          <StorePanel store={store} />
        </div>
      )}
      <Segmented<Tab>
        ariaLabel="Seções de configuração"
        value={tab}
        onChange={setTab}
        className="mb-5 w-full sm:w-auto"
        options={[
          { value: "perfil", label: "Perfil" },
          { value: "seguranca", label: "Segurança" },
          ...(showResale ? [{ value: "revenda" as const, label: "Revenda" }] : []),
        ]}
      />
      {tab === "perfil" && <ProfilePanel profile={profile} email={email} />}
      {tab === "seguranca" && <SecurityPanel logins={logins} />}
      {tab === "revenda" && <ResellerPanel request={resellerRequest ?? null} isReseller={profile.role === "reseller"} />}
    </>
  );
}
