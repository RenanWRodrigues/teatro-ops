// Verificação do site publicado: as páginas principais respondem e mostram dados reais?
//
// Em 17/11/2026 o site foi ao ar inteiro com fixtures [EXEMPLO] (sem banco no build) e nada
// avisou. Aqui o job diário abre algumas páginas e alerta se aparecer o selo [EXEMPLO]
// (components/AvisoExemplo.tsx e manchetes de exemplo) ou um erro HTTP.
import { USER_AGENT } from "@/lib/fontes/_base/http";

/** Páginas que leem o banco e mostram [EXEMPLO] quando caem nas fixtures. */
export const PAGINAS_VERIFICADAS = ["/", "/arsenal", "/conflitos"] as const;

export type SituacaoPagina = "ok" | "exemplo" | "erro" | "protegida";
export type VerificacaoPagina = { caminho: string; situacao: SituacaoPagina; detalhe: string | null };

const SELO_EXEMPLO = "[EXEMPLO]";

/** Login da Vercel (Deployment Protection): redireciona para vercel.com/sso-api ou responde 401. */
const ehProtecao = (status: number, local: string | null) =>
  status === 401 || (status >= 300 && status < 400 && !!local && /vercel\.com\/(sso-api|login)/.test(local));

export async function verificarSite(
  urlBase: string,
  opcoes: { bypass?: string | null; fetchImpl?: typeof fetch; caminhos?: readonly string[] } = {},
): Promise<VerificacaoPagina[]> {
  const base = urlBase.replace(/\/+$/, "");
  const fetchImpl = opcoes.fetchImpl ?? fetch;
  // fetch direto (não fetchComRetry): é preciso ver o 3xx e o Location para reconhecer o login da Vercel.
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  // "Protection Bypass for Automation" da Vercel: deixa o robô passar pelo login sem desligar a proteção.
  if (opcoes.bypass) headers["x-vercel-protection-bypass"] = opcoes.bypass;
  const saida: VerificacaoPagina[] = [];
  for (const caminho of opcoes.caminhos ?? PAGINAS_VERIFICADAS) {
    try {
      const resp = await fetchImpl(`${base}${caminho}`, { headers, redirect: "manual", signal: AbortSignal.timeout(30_000) });
      if (ehProtecao(resp.status, resp.headers.get("location"))) {
        saida.push({ caminho, situacao: "protegida", detalhe: "login da Vercel (Deployment Protection)" });
        continue;
      }
      if (resp.status >= 300) {
        saida.push({ caminho, situacao: "erro", detalhe: `HTTP ${resp.status}` });
        continue;
      }
      const html = await resp.text();
      saida.push(html.includes(SELO_EXEMPLO) ? { caminho, situacao: "exemplo", detalhe: "página com dados [EXEMPLO]" } : { caminho, situacao: "ok", detalhe: null });
    } catch (e) {
      saida.push({ caminho, situacao: "erro", detalhe: `sem resposta (${(e as Error).name})` });
    }
  }
  return saida;
}
