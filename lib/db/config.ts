import { z } from "zod";

const esquemaPublico = z.object({
  url: z.url(),
  anonKey: z.string().min(20),
});

export type ConfigPublica = z.infer<typeof esquemaPublico>;

/**
 * URL e chave anon do Supabase. Devolve `null` se não estiverem configuradas:
 * o site continua funcionando com as fixtures [EXEMPLO] (falha graciosa).
 */
export function configPublica(): ConfigPublica | null {
  const r = esquemaPublico.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return r.success ? r.data : null;
}

/** Tempo máximo de cada requisição ao banco: uma fonte lenta nunca trava o build nem a página. */
export const TIMEOUT_MS = 8_000;

export const fetchComTimeout: typeof fetch = (entrada, init) =>
  fetch(entrada, { ...init, signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS) });
