// Ponto de entrada da ingestão (GitHub Actions e local).
//   pnpm tsx scripts/ingestao/run.ts --job noticias
//   pnpm tsx scripts/ingestao/run.ts --fonte gdelt-doc [--horas 3] [--seco [--traduzir]] [--amostra 10]
//   --seco não grava nada e não chama o DeepL (só o cache); --traduzir chama o DeepL mesmo assim (gasta cota).
import { parseArgs } from "node:util";
import { clienteAdmin } from "@/lib/db/admin";
import { configFontes } from "@/lib/fontes/_base/config";
import { executarIngestao, JOBS, selecionarFontes, type Job } from "@/lib/ingestao/executar";
import { executarManutencao, RETENCAO_DIAS } from "@/lib/manutencao";
import { criarDependenciasTraducao } from "@/lib/traducao";
import { criarClienteDeepL } from "@/lib/traducao/deepl";

const { values } = parseArgs({
  options: {
    job: { type: "string" },
    fonte: { type: "string" },
    horas: { type: "string" },
    seco: { type: "boolean", default: false },
    traduzir: { type: "boolean", default: false },
    amostra: { type: "string", default: "0" },
  },
});

const job = values.job as Job | "todos" | undefined;
if (!values.fonte && (!job || (job !== "todos" && !(JOBS as readonly string[]).includes(job)))) {
  console.error(`Uso: run.ts --job <${[...JOBS, "todos"].join("|")}>  ou  --fonte <id> [--horas N] [--seco [--traduzir]] [--amostra N]`);
  process.exit(2);
}

// Job de serviço: verificação das fontes, limpeza, cota do DeepL e alertas no GitHub (lib/manutencao).
if (job === "manutencao") {
  const db = clienteAdmin();
  const chave = process.env.DEEPL_API_KEY?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  const repositorio = process.env.GITHUB_REPOSITORY?.trim();
  const r = await executarManutencao({
    db,
    fontes: [...configFontes().values()],
    usoDeepl: chave ? () => criarClienteDeepL(chave).uso() : undefined,
    github: token && repositorio ? { token, repositorio } : null,
    site: process.env.SITE_PUBLICO_URL?.trim() ? { url: process.env.SITE_PUBLICO_URL.trim(), bypass: process.env.VERCEL_PROTECTION_BYPASS?.trim() || null } : null,
    seco: values.seco,
  });
  for (const c of r.coleta) {
    console.log(`[coleta] ${c.quebrada ? "SEM COLETA" : "ok"} · ${c.id} (${c.job}) · último sucesso: ${c.ultimoSucesso ?? "nunca"}`);
  }
  for (const s of r.enderecos) console.log(`[endereco] ${s.ok ? "ok" : s.motivo} · ${s.id} · ${s.status ?? "—"} · ${s.ms} ms`);
  console.log(
    `[limpeza] ${r.removidas.noticias} notícia(s) com mais de ${RETENCAO_DIAS.noticias} dias e ${r.removidas.execucoes} registro(s) de execução com mais de ${RETENCAO_DIAS.execucoes} dias${values.seco ? " (seco: nada apagado)" : ""}`,
  );
  for (const p of r.site ?? []) console.log(`[site] ${p.situacao} · ${p.caminho}${p.detalhe ? ` · ${p.detalhe}` : ""}`);
  if (r.deepl) console.log(`[deepl] ${r.deepl.usados.toLocaleString("pt-BR")} de ${r.deepl.limite.toLocaleString("pt-BR")} caracteres (${(r.deepl.fracao * 100).toFixed(1)}%)`);
  for (const p of r.publicados) console.log(`[alerta] ${p}`);
  if (!r.alertas.length) console.log("[alerta] nenhum");
  process.exit(0);
}

// Sem fonte a rodar, termina antes de exigir as chaves do banco (agendamentos não ficam vermelhos à toa).
if (selecionarFontes(configFontes(), { job, fonte: values.fonte }).length === 0) {
  console.log(`[ingestao] nenhuma fonte ativa para o job "${job}" — nada a fazer.`);
  process.exit(0);
}

const db = clienteAdmin();
const { deps, diagnostico } = await criarDependenciasTraducao(db, (m) => console.log(`[traducao] ${m}`));
console.log(`[traducao] DeepL: ${diagnostico.deepl} · glossário: ${diagnostico.glossario} · LibreTranslate: ${diagnostico.libre}`);

const saidas = await executarIngestao(db, deps, {
  job,
  fonte: values.fonte,
  horas: values.horas ? Number(values.horas) : undefined,
  seco: values.seco,
  traduzirNoSeco: values.traduzir,
});

for (const s of saidas) {
  const r = s.resultado;
  const motores = Object.entries(r.motores).map(([m, n]) => `${m}=${n}`).join(" ") || "—";
  console.log(
    `[${s.fonteId}] ${r.erro ? "ERRO" : "ok"} · novos=${r.itensNovos} ignorados=${r.itensIgnorados} · ` +
      `DeepL=${r.caracteresTraduzidos} caracteres · motores: ${motores}${values.seco ? " · (seco: nada gravado)" : ""}`,
  );
  const n = Number(values.amostra);
  for (const l of s.amostra.slice(0, n)) console.log(`  • ${l}`);
}

if (deps.deepl) {
  try {
    const restante = await criarClienteDeepL(process.env.DEEPL_API_KEY!.trim()).restante();
    console.log(`[traducao] DeepL: ${restante.toLocaleString("pt-BR")} caracteres restantes no mês`);
  } catch {
    /* só informativo */
  }
}

// Falha o job (vermelho no Actions) só se todas as fontes falharam; falha parcial fica no log e no banco.
const falhas = saidas.filter((s) => s.resultado.erro).length;
process.exit(saidas.length > 0 && falhas === saidas.length ? 1 : 0);
