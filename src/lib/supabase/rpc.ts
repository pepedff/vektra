import { friendlyError, isKnownError, type ActionResult } from "@/lib/errors";
import { createClient } from "./server";

/** Chama uma função SQL como o usuário logado; RLS e as checagens da função continuam valendo. */
export async function runRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<ActionResult<T>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (!isKnownError(error)) console.error(`[rpc:${fn}]`, error);
    return { ok: false, error: friendlyError(error) };
  }
  return { ok: true, data: data as T };
}

export function fail(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}
