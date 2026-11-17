// Alertas do job `manutencao`: issue automática no GitHub (Fase 11, item 3).
// Uma issue aberta por assunto: se já existir uma aberta com o mesmo título, o alerta vira comentário nela
// (o job roda todo dia e não deve empilhar issues repetidas).

export type Alerta = { titulo: string; corpo: string };

export type DestinoGithub = { token: string; repositorio: string; fetchImpl?: typeof fetch };

const API = "https://api.github.com";

async function chamar(d: DestinoGithub, caminho: string, init: RequestInit = {}) {
  const r = await (d.fetchImpl ?? fetch)(`${API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${d.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "TEATRO-OPS/1.0 (manutencao)",
    },
  });
  if (!r.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${caminho}: HTTP ${r.status}`);
  return r.json() as Promise<unknown>;
}

/** Cria a issue ou comenta na aberta de mesmo título. Devolve o que foi feito, para o log do job. */
export async function publicarAlerta(alerta: Alerta, destino: DestinoGithub): Promise<{ acao: "criada" | "comentada"; numero: number }> {
  const abertas = (await chamar(destino, `/repos/${destino.repositorio}/issues?state=open&per_page=100`)) as {
    number: number;
    title: string;
    pull_request?: unknown;
  }[];
  const existente = abertas.find((i) => !i.pull_request && i.title === alerta.titulo);
  if (existente) {
    await chamar(destino, `/repos/${destino.repositorio}/issues/${existente.number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: alerta.corpo }),
    });
    return { acao: "comentada", numero: existente.number };
  }
  const nova = (await chamar(destino, `/repos/${destino.repositorio}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: alerta.titulo, body: alerta.corpo }),
  })) as { number: number };
  return { acao: "criada", numero: nova.number };
}

export const TITULO_ALERTA_FONTES = "Manutenção: fontes de dados com problema";
export const TITULO_ALERTA_DEEPL = "Manutenção: cota do DeepL acima de 70%";
export const TITULO_ALERTA_SITE = "Manutenção: site publicado sem dados reais";
export const LIMIAR_COTA_DEEPL = 0.7;
