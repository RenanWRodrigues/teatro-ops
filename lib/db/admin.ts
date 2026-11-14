// Cliente Supabase com service_role: SÓ para os scripts de ingestão (GitHub Actions / tsx local).
// Ignora o RLS. Nunca importe em app/ ou components/ (o ESLint bloqueia; ver eslint.config.mjs).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fetchComTimeout } from "./config";

const esquema = z.object({
  url: z.url(),
  serviceRoleKey: z.string().min(20),
});

export function clienteAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("clienteAdmin() não pode rodar no navegador.");
  }
  const r = esquema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!r.success) {
    // Não inclui os valores na mensagem para não vazar segredos em logs.
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env.local ou secrets do GitHub).");
  }
  return createClient(r.data.url, r.data.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchComTimeout },
  });
}
