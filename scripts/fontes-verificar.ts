// pnpm fontes:verificar — testa o endereço de cada fonte de config/fontes.yaml e, com o banco configurado,
// mostra há quanto tempo cada fonte ativa não tem coleta bem-sucedida. Não altera o YAML: o status de cada
// fonte é decidido por quem lê o relatório (ver /verificar-fontes).
import { clienteAdmin } from "../lib/db/admin";
import { configFontes } from "../lib/fontes/_base/config";
import { formatarCarimbo } from "../lib/format";
import { avaliarColeta, sondarEndereco, type Execucao } from "../lib/manutencao/saude";

const fontes = [...configFontes().values()];
console.log(`[fontes:verificar] ${fontes.length} fontes registradas\n`);
console.log("fonte · status no YAML · endereço · tempo · observação");
for (const f of fontes) {
  const s = await sondarEndereco(f);
  const resultado = !s ? "sem endereço testável" : s.ok ? `ok (HTTP ${s.status})` : (s.motivo ?? "erro");
  console.log(`${f.id} · ${f.status} · ${resultado} · ${s ? `${s.ms} ms` : "—"}`);
}

let db;
try {
  db = clienteAdmin();
} catch {
  console.log("\n[fontes:verificar] banco não configurado: pulando a verificação de coleta.");
  process.exit(0);
}
const { data, error } = await db
  .from("execucoes_ingestao")
  .select("fonte_id, terminado_em, erro")
  .gte("iniciado_em", new Date(Date.now() - 30 * 86_400_000).toISOString())
  .limit(10_000);
if (error) {
  console.log(`\n[fontes:verificar] não foi possível ler as execuções: ${error.message}`);
  process.exit(0);
}
console.log("\nfonte ativa · job · último sucesso · situação");
for (const c of avaliarColeta(fontes, (data ?? []) as Execucao[], new Date())) {
  console.log(`${c.id} · ${c.job} · ${c.ultimoSucesso ? formatarCarimbo(c.ultimoSucesso) : "nunca"} · ${c.quebrada ? `SEM COLETA${c.mensagem ? ` (${c.mensagem.slice(0, 80)})` : ""}` : "ok"}`);
}
