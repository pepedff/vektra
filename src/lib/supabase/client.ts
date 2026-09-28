import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let browserClient: SupabaseClient | undefined;

export function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const { url, anonKey } = supabaseEnv();
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}
