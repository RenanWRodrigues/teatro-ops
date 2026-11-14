// Cliente Supabase com a chave anon para Server Components (só leitura, sujeito ao RLS).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configPublica, fetchComTimeout } from "./config";

let cliente: SupabaseClient | null | undefined;

/** `null` quando o Supabase não está configurado (as consultas caem para as fixtures). */
export function clienteServidor(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const cfg = configPublica();
  cliente = cfg
    ? createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: fetchComTimeout },
      })
    : null;
  return cliente;
}
