"use client";

import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { Plan } from "@/lib/supabase/types";
import { useAction } from "@/lib/use-action";
import { issueLicense } from "@/server/admin-actions";

export type CustomerOption = { id: string; name: string; email: string; plan_id?: string | null };

export function AddLicenseModal({
  open,
  onClose,
  customers,
  plans,
  customerId: initialCustomer,
}: {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
  plans: Plan[];
  customerId?: string;
}) {
  const { run, pending } = useAction();
  const [customerId, setCustomerId] = useState("");
  const [plan, setPlan] = useState("");
  const [validity, setValidity] = useState("30");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    const chosen = customers.find((c) => c.id === initialCustomer) ?? customers[0];
    setCustomerId(chosen?.id ?? "");
    setPlan(chosen?.plan_id ?? plans.find((p) => p.highlight)?.id ?? plans[0]?.id ?? "");
    setQuantity(1);
  }, [open, initialCustomer, customers, plans]);

  const invalidQty = !Number.isInteger(quantity) || quantity < 1 || quantity > 50;

  const submit = () => {
    if (invalidQty || !customerId || !plan) return;
    const who = customers.find((c) => c.id === customerId);
    run(
      () => issueLicense({ userId: customerId, planId: plan, days: Number(validity), quantity }),
      {
        title: quantity > 1 ? `${quantity} licenças adicionadas` : "Licença adicionada",
        description: `${who?.name || who?.email} recebeu acesso ${plans.find((p) => p.id === plan)?.name} por ${validity} dias.`,
      },
      onClose,
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar licença"
      description="A chave é gerada na hora e o cliente é notificado no painel."
      icon={<KeyRound className="size-5" />}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="action" loading={pending} disabled={invalidQty || !customerId} onClick={submit}>
            {pending ? "Adicionando..." : "Adicionar licença"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Cliente" htmlFor="al-customer">
          <Select id="al-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || "Sem nome"} — {c.email}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plano" htmlFor="al-plan">
            <Select id="al-plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Validade" htmlFor="al-validity">
            <Select id="al-validity" value={validity} onChange={(e) => setValidity(e.target.value)}>
              <option value="3">3 dias</option>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
              <option value="365">1 ano</option>
            </Select>
          </Field>
        </div>
        <Field label="Quantidade" htmlFor="al-qty" error={invalidQty ? "Entre 1 e 50 licenças por vez." : undefined}>
          <Input
            id="al-qty"
            type="number"
            min={1}
            max={50}
            value={quantity}
            invalid={invalidQty}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </Field>
      </form>
    </Modal>
  );
}
