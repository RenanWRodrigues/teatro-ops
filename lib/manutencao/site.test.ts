import { describe, expect, it } from "vitest";
import { TITULO_ALERTA_SITE } from "./alertas";
import { montarAlertas } from "./index";
import { verificarSite } from "./site";

type Resposta = { status: number; corpo?: string; location?: string } | Error;

/** fetch falso: uma resposta por caminho; guarda os cabeçalhos enviados. */
function fetchFalso(respostas: Record<string, Resposta>) {
  const pedidos: { url: string; bypass: string | null; redirect?: RequestRedirect }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, bypass: new Headers(init.headers).get("x-vercel-protection-bypass"), redirect: init.redirect });
    const r = respostas[new URL(url).pathname]!;
    if (r instanceof Error) throw r;
    return new Response(r.corpo ?? "", { status: r.status, headers: r.location ? { location: r.location } : {} });
  }) as unknown as typeof fetch;
  return { fetchImpl, pedidos };
}

describe("verificarSite", () => {
  it("classifica página real, com [EXEMPLO], com erro e fora do ar", async () => {
    const { fetchImpl, pedidos } = fetchFalso({
      "/": { status: 200, corpo: "<main>Conflitos em foco</main>" },
      "/arsenal": { status: 200, corpo: "<strong>[EXEMPLO]</strong> dados ilustrativos" },
      "/conflitos": { status: 500 },
      "/governos": new TypeError("fetch failed"),
    });
    const r = await verificarSite("https://site.example/", { fetchImpl, caminhos: ["/", "/arsenal", "/conflitos", "/governos"] });
    expect(r.map((p) => [p.caminho, p.situacao])).toEqual([
      ["/", "ok"],
      ["/arsenal", "exemplo"],
      ["/conflitos", "erro"],
      ["/governos", "erro"],
    ]);
    expect(pedidos[0]).toMatchObject({ url: "https://site.example/", bypass: null, redirect: "manual" });
  });

  it("reconhece o login da Vercel e envia o segredo de bypass quando configurado", async () => {
    const { fetchImpl, pedidos } = fetchFalso({
      "/": { status: 302, location: "https://vercel.com/sso-api?url=https%3A%2F%2Fsite.example%2F" },
      "/arsenal": { status: 401 },
    });
    const r = await verificarSite("https://site.example", { fetchImpl, bypass: "segredo", caminhos: ["/", "/arsenal"] });
    expect(r.map((p) => p.situacao)).toEqual(["protegida", "protegida"]);
    expect(pedidos.every((p) => p.bypass === "segredo")).toBe(true);
  });
});

describe("alerta do site publicado", () => {
  const agora = new Date("2026-11-17T15:00:00Z");
  const base = { coleta: [], enderecos: [], deepl: null };

  it("alerta para [EXEMPLO] e erro, mas não para página protegida", () => {
    const alertas = montarAlertas(
      {
        ...base,
        site: [
          { caminho: "/", situacao: "ok", detalhe: null },
          { caminho: "/arsenal", situacao: "exemplo", detalhe: "página com dados [EXEMPLO]" },
          { caminho: "/conflitos", situacao: "protegida", detalhe: "login da Vercel (Deployment Protection)" },
        ],
      },
      agora,
    );
    expect(alertas.map((a) => a.titulo)).toEqual([TITULO_ALERTA_SITE]);
    expect(alertas[0]!.corpo).toContain("`/arsenal`");
    expect(alertas[0]!.corpo).not.toContain("`/conflitos`");
  });

  it("sem verificação do site, nenhum alerta novo", () => {
    expect(montarAlertas({ ...base, site: null }, agora)).toEqual([]);
  });
});
