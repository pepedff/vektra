import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

const READ_ONLY_COOKIES = /Cookies can only be modified in a Server Action or Route Handler/;

/** Cliente por requisição. Em Server Components os cookies são somente leitura; o proxy renova a sessão. */
export async function createClient(): Promise<SupabaseClient> {
  // cookies() primeiro: marca a rota como dinâmica antes de qualquer erro de configuração no build.
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch (error) {
          if (!(error instanceof Error && READ_ONLY_COOKIES.test(error.message))) throw error;
        }
      },
    },
  });
}
