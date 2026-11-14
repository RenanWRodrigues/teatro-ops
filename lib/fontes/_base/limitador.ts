// Limitador de taxa por fonte, lendo o campo `limite` de config/fontes.yaml (ex.: "1 req / 5 s").

/** "1 req / 5 s" → 5000; "2 req / s" → 500; texto sem padrão de requisições → null. */
export function intervaloDoLimite(limite: string | undefined): number | null {
  if (!limite) return null;
  const m = /(\d+)\s*req\w*\s*\/\s*(\d+(?:[.,]\d+)?)?\s*(s|seg|min)\b/i.exec(limite);
  if (!m) return null;
  const reqs = Number(m[1]);
  const quantidade = m[2] ? Number(m[2].replace(",", ".")) : 1;
  const unidadeMs = m[3]?.toLowerCase() === "min" ? 60_000 : 1_000;
  return reqs > 0 ? Math.ceil((quantidade * unidadeMs) / reqs) : null;
}

type Relogio = { agora: () => number; esperar: (ms: number) => Promise<void> };

const relogioReal: Relogio = {
  agora: () => Date.now(),
  esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/**
 * Cria um limitador: `await aguardar()` antes de cada requisição garante o intervalo mínimo.
 * Chamadas concorrentes entram numa fila (nunca disparam juntas).
 */
export function criarLimitador(intervaloMs: number, relogio: Relogio = relogioReal) {
  let proximaLiberacao = 0;
  let fila: Promise<void> = Promise.resolve();
  return function aguardar(): Promise<void> {
    fila = fila.then(async () => {
      const espera = proximaLiberacao - relogio.agora();
      if (espera > 0) await relogio.esperar(espera);
      proximaLiberacao = relogio.agora() + intervaloMs;
    });
    return fila;
  };
}

const limitadores = new Map<string, () => Promise<void>>();

/**
 * Limitador compartilhado da fonte `idFonte` no processo. `limiteYaml` vem de config/fontes.yaml;
 * sem limite declarado, usa 1 req/s por educação com o servidor.
 */
export function rateLimiter(idFonte: string, limiteYaml?: string): () => Promise<void> {
  let l = limitadores.get(idFonte);
  if (!l) {
    l = criarLimitador(intervaloDoLimite(limiteYaml) ?? 1_000);
    limitadores.set(idFonte, l);
  }
  return l;
}
