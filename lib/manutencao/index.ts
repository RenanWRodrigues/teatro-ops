// Job `manutencao` (diário; Fase 11, item 3): verifica as fontes, limpa dados antigos, mede a cota do DeepL
// e abre/comenta issues no GitHub quando algo precisa de atenção. As consultas também mantêm o projeto
// gratuito do Supabase ativo (ele pausa após dias sem uso).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FonteYaml } from "@/lib/fontes/registro";
import { formatarCarimbo } from "@/lib/format";
import { LIMIAR_COTA_DEEPL, publicarAlerta, TITULO_ALERTA_DEEPL, TITULO_ALERTA_FONTES, TITULO_ALERTA_SITE, type Alerta, type DestinoGithub } from "./alertas";
import { avaliarColeta, sondarEndereco, type Execucao, type SaudeColeta, type SondagemEndereco } from "./saude";
import { verificarSite, type VerificacaoPagina } from "./site";

/** Retenção: notícias somem do banco depois de 180 dias; o log de execuções, depois de 90. */
export const RETENCAO_DIAS = { noticias: 180, execucoes: 90 } as const;

export type RelatorioManutencao = {
  coleta: SaudeColeta[];
  enderecos: SondagemEndereco[];
  removidas: { noticias: number; execucoes: number };
  deepl: { usados: number; limite: number; fracao: number } | null;
  /** Páginas do site publicado (null = SITE_PUBLICO_URL não configurada). */
  site: VerificacaoPagina[] | null;
  alertas: Alerta[];
  publicados: string[];
};

type Opcoes = {
  db: SupabaseClient;
  fontes: FonteYaml[];
  agora?: Date;
  /** Uso do DeepL (null = sem chave configurada). */
  usoDeepl?: () => Promise<{ usados: number; limite: number }>;
  github?: DestinoGithub | null;
  /** Site publicado a verificar; `bypass` = segredo "Protection Bypass for Automation" da Vercel. */
  site?: { url: string; bypass?: string | null } | null;
  /** Não apaga dados nem publica issues (só relata). */
  seco?: boolean;
  fetchImpl?: typeof fetch;
  log?: (m: string) => void;
};

const dias = (n: number, agora: Date) => new Date(agora.getTime() - n * 86_400_000).toISOString();
const quando = (iso: string | null) => (iso ? formatarCarimbo(iso) : "nunca");

/** Endereço com problema que merece alerta: fora do ar de verdade (rede, 404, 5xx), não "pede parâmetros". */
const enderecoQuebrado = (s: SondagemEndereco) => !s.ok && (s.status === null || s.status === 404 || s.status === 410 || s.status >= 500);

export function montarAlertas(r: Pick<RelatorioManutencao, "coleta" | "enderecos" | "deepl"> & { site?: VerificacaoPagina[] | null }, agora: Date): Alerta[] {
  const alertas: Alerta[] = [];
  const semColeta = r.coleta.filter((c) => c.quebrada);
  const foraDoAr = r.enderecos.filter(enderecoQuebrado);
  if (semColeta.length || foraDoAr.length) {
    const linhas = [
      `Verificação diária de ${formatarCarimbo(agora)} (horário de Brasília).`,
      "",
      ...(semColeta.length
        ? [
            "**Fontes ativas sem coleta bem-sucedida no prazo esperado**",
            "",
            "| Fonte | Job | Último sucesso | Último erro |",
            "|---|---|---|---|",
            ...semColeta.map((c) => `| \`${c.id}\` | ${c.job} | ${quando(c.ultimoSucesso)} | ${c.mensagem ? c.mensagem.replace(/\|/g, "/").slice(0, 160) : "—"} |`),
            "",
          ]
        : []),
      ...(foraDoAr.length
        ? [
            "**Endereços que não responderam**",
            "",
            "| Fonte | Endereço | Resultado |",
            "|---|---|---|",
            ...foraDoAr.map((s) => `| \`${s.id}\` | ${s.url} | ${s.motivo ?? "erro"} |`),
            "",
          ]
        : []),
      "Próximo passo: rodar `/verificar-fontes`, investigar a causa (URL mudou? credencial? formato?) e, se for o caso, marcar `status: quebrada` em `config/fontes.yaml`.",
    ];
    alertas.push({ titulo: TITULO_ALERTA_FONTES, corpo: linhas.join("\n") });
  }
  if (r.deepl && r.deepl.fracao > LIMIAR_COTA_DEEPL) {
    const pct = (r.deepl.fracao * 100).toFixed(1).replace(".", ",");
    alertas.push({
      titulo: TITULO_ALERTA_DEEPL,
      corpo: [
        `Em ${formatarCarimbo(agora)}, o DeepL Free já usou **${pct}%** da cota do mês (${r.deepl.usados.toLocaleString("pt-BR")} de ${r.deepl.limite.toLocaleString("pt-BR")} caracteres).`,
        "",
        "Ao acabar a cota, os títulos ficam com \"Tradução pendente\" até o mês virar (ou até o LibreTranslate, se configurado, assumir).",
        "Opções: reduzir as consultas do GDELT em `config/fontes.yaml`, configurar `LIBRETRANSLATE_URL` ou aguardar a renovação.",
      ].join("\n"),
    });
  }
  const paginasRuins = (r.site ?? []).filter((p) => p.situacao === "exemplo" || p.situacao === "erro");
  if (paginasRuins.length) {
    alertas.push({
      titulo: TITULO_ALERTA_SITE,
      corpo: [
        `Verificação de ${formatarCarimbo(agora)} (horário de Brasília).`,
        "",
        "| Página | Problema |",
        "|---|---|",
        ...paginasRuins.map((p) => `| \`${p.caminho}\` | ${p.detalhe ?? p.situacao} |`),
        "",
        "Se aparece [EXEMPLO], o site não leu o banco: confira na Vercel (Settings → Environment Variables, ambiente Production) `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, se o projeto do Supabase não está pausado e faça um Redeploy sem o cache de build.",
      ].join("\n"),
    });
  }
  return alertas;
}

export async function executarManutencao(opcoes: Opcoes): Promise<RelatorioManutencao> {
  const { db, fontes, agora = new Date(), usoDeepl, github, seco = false, fetchImpl, log = console.log } = opcoes;

  // 1) Coleta: execuções dos últimos 30 dias.
  const { data: execs, error: erroExec } = await db
    .from("execucoes_ingestao")
    .select("fonte_id, terminado_em, erro")
    .gte("iniciado_em", dias(30, agora))
    .order("iniciado_em", { ascending: false })
    .limit(10_000);
  if (erroExec) throw new Error(`consulta de execuções: ${erroExec.message}`);
  const coleta = avaliarColeta(fontes, (execs ?? []) as Execucao[], agora);

  // 2) Endereços das fontes ativas (uma requisição por fonte, uma de cada vez).
  const enderecos: SondagemEndereco[] = [];
  for (const f of fontes.filter((x) => x.status === "ativa")) {
    const s = await sondarEndereco(f, { fetchImpl });
    if (s) enderecos.push(s);
  }

  // 3) Limpeza.
  const removidas = { noticias: 0, execucoes: 0 };
  if (!seco) {
    const n = await db.from("noticias").delete({ count: "exact" }).lt("publicado_em", dias(RETENCAO_DIAS.noticias, agora));
    if (n.error) throw new Error(`limpeza de notícias: ${n.error.message}`);
    removidas.noticias = n.count ?? 0;
    const e = await db.from("execucoes_ingestao").delete({ count: "exact" }).lt("iniciado_em", dias(RETENCAO_DIAS.execucoes, agora));
    if (e.error) throw new Error(`limpeza do log de execuções: ${e.error.message}`);
    removidas.execucoes = e.count ?? 0;
  }

  // 4) Cota do DeepL.
  let deepl: RelatorioManutencao["deepl"] = null;
  if (usoDeepl) {
    try {
      const u = await usoDeepl();
      deepl = { ...u, fracao: u.limite > 0 ? u.usados / u.limite : 0 };
    } catch (e) {
      log(`[manutencao] não foi possível ler o uso do DeepL: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 5) Site publicado: páginas no ar e com dados reais.
  let site: VerificacaoPagina[] | null = null;
  if (opcoes.site?.url) site = await verificarSite(opcoes.site.url, { bypass: opcoes.site.bypass, fetchImpl });
  else log("[manutencao] SITE_PUBLICO_URL não configurada: verificação do site publicado pulada.");

  // 6) Alertas.
  const alertas = montarAlertas({ coleta, enderecos, deepl, site }, agora);
  const publicados: string[] = [];
  for (const a of alertas) {
    if (seco || !github) {
      log(`[manutencao] alerta (não publicado${seco ? ": modo seco" : ": sem GITHUB_TOKEN"}): ${a.titulo}`);
      continue;
    }
    const r = await publicarAlerta(a, github);
    publicados.push(`${a.titulo} → issue #${r.numero} ${r.acao}`);
  }

  // 7) Registro da própria execução (sem fonte: é um job de serviço).
  if (!seco) {
    const { error } = await db.from("execucoes_ingestao").insert({
      job: "manutencao",
      fonte_id: null,
      iniciado_em: agora.toISOString(),
      terminado_em: new Date().toISOString(),
      itens_novos: 0,
      itens_ignorados: removidas.noticias + removidas.execucoes,
      erro: alertas.length ? alertas.map((a) => a.titulo).join(" | ") : null,
    });
    if (error) log(`[manutencao] não foi possível registrar a execução: ${error.message}`);
  }

  return { coleta, enderecos, removidas, deepl, site, alertas, publicados };
}
