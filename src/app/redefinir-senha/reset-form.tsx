"use client";

import { Check, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, type ActionState } from "@/components/ui/action-button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updatePassword } from "../login/actions";

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [state, setState] = useState<ActionState>("idle");

  const submit = async () => {
    if (state === "loading") return;
    const problem =
      password.length < 8 ? "A senha precisa ter pelo menos 8 caracteres." : password !== confirm ? "As senhas não conferem." : undefined;
    setError(problem);
    if (problem) return;

    setState("loading");
    const res = await updatePassword(password);
    if (!res.ok) {
      setState("error");
      setError(res.error);
      window.setTimeout(() => setState("idle"), 1500);
      return;
    }
    setState("success");
    toast({ type: "success", title: "Senha alterada", description: "Use a nova senha no próximo acesso." });
    router.replace(res.data.redirectTo);
  };

  return (
    <form
      className="w-full max-w-[400px] space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Crie uma nova senha</h1>
      <p className="pb-2 text-[14.5px] text-muted">Conta: {email}</p>
      <Field label="Nova senha" htmlFor="rp-pass" error={error}>
        <Input
          id="rp-pass"
          type="password"
          autoComplete="new-password"
          leading={<Lock className="size-4" />}
          value={password}
          invalid={!!error}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Confirmar senha" htmlFor="rp-confirm">
        <Input
          id="rp-confirm"
          type="password"
          autoComplete="new-password"
          leading={<Lock className="size-4" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <div className="pt-2">
        <ActionButton type="submit" state={state} icon={<Check className="size-[18px]" />} loadingText="Salvando..." successText="Senha alterada">
          Salvar nova senha
        </ActionButton>
      </div>
    </form>
  );
}
