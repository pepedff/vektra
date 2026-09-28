import { isSupabaseConfigured, supabaseEnv } from "@/lib/supabase/env";
import type { Plan } from "@/lib/supabase/types";

/** Planos públicos para a landing. Sem cookies, então pode ser cacheado (ISR). */
export async function publicPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured()) return [];
  const { url, anonKey } = supabaseEnv();
  const endpoint = new URL("/rest/v1/plans", url);
  endpoint.searchParams.set("select", "*");
  endpoint.searchParams.set("active", "eq.true");
  endpoint.searchParams.set("order", "sort.asc");
  try {
    const res = await fetch(endpoint, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      next: { revalidate: 300, tags: ["plans"] },
    });
    if (!res.ok) {
      console.error("[publicPlans]", res.status, await res.text());
      return [];
    }
    return (await res.json()) as Plan[];
  } catch (error) {
    console.error("[publicPlans]", error);
    return [];
  }
}
