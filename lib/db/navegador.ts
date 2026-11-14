// Cliente Supabase anon para Client Components (ex.: busca interativa na Fase 10).
// Só a chave anon pode chegar ao navegador; o RLS limita o acesso à leitura pública.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configPublica, fetchComTimeout } from "./config";

let cliente: SupabaseClient | null | undefined;

export function clienteNavegador(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const cfg = configPublica();
  cliente = cfg ? createClient(cfg.url, cfg.anonKey, { global: { fetch: fetchComTimeout } }) : null;
  return cliente;
}
