"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import type { ToastType } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/errors";

type SuccessToast = { type?: ToastType; title: string; description?: string };

/** Executa uma Server Action, mostra o resultado em toast e recarrega os dados do servidor. */
export function useAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const run = <T>(
    action: () => Promise<ActionResult<T>>,
    success: SuccessToast | ((data: T) => SuccessToast),
    onSuccess?: (data: T) => void,
  ): void => {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        toast({ type: "error", title: "Não foi possível concluir", description: res.error });
        return;
      }
      const t = typeof success === "function" ? success(res.data) : success;
      toast({ type: t.type ?? "success", title: t.title, description: t.description });
      onSuccess?.(res.data);
      router.refresh();
    });
  };

  return { run, pending };
}
