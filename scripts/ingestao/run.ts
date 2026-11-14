// Ponto de entrada da ingestão (GitHub Actions e local).
//   pnpm tsx scripts/ingestao/run.ts --job noticias
//   pnpm tsx scripts/ingestao/run.ts --fonte gdelt-doc [--horas 3] [--seco] [--amostra 10]
import { parseArgs } from "node:util";
import { clienteAdmin } from "@/lib/db/admin";
import { configFontes } from "@/lib/fontes/_base/config";
import { executarIngestao, JOBS, selecionarFontes, type Job } from "@/lib/ingestao/executar";
import { criarDependenciasTraducao } from "@/lib/traducao";
import { criarClienteDeepL } from "@/lib/traducao/deepl";

const { values } = parseArgs({
  options: {
    job: { type: "string" },
    fonte: { type: "string" },
    horas: { type: "string" },
    seco: { type: "boolean", default: false },
    amostra: { type: "string", default: "0" },
  },
});

const job = values.job as Job | "todos" | undefined;
if (!values.fonte && (!job || (job !== "todos" && !(JOBS as readonly string[]).includes(job)))) {
  console.error(`Uso: run.ts --job <${[...JOBS, "todos"].join("|")}>  ou  --fonte <id> [--horas N] [--seco] [--amostra N]`);
  process.exit(2);
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
});

for (const s of saidas) {
  const r = s.resultado;
  const motores = Object.entries(r.motores).map(([m, n]) => `${m}=${n}`).join(" ") || "—";
  console.log(
    `[${s.fonteId}] ${r.erro ? "ERRO" : "ok"} · novos=${r.itensNovos} ignorados=${r.itensIgnorados} · ` +
      `DeepL=${r.caracteresTraduzidos} caracteres · motores: ${motores}${values.seco ? " · (seco: nada gravado)" : ""}`,
  );
  const n = Number(values.amostra);
  for (const l of s.linhas.slice(0, n)) {
    console.log(`  • [${l.regiao ?? "—"}] ${l.titulo_pt ?? `(tradução pendente) ${l.titulo_original}`}  — ${new URL(l.url).hostname}`);
  }
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
