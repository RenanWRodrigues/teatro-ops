// Fotos gravadas antes da regra "CC BY exige autor" (revisão da Fase 9): lista e, com --apagar, remove
// as de licença com atribuição obrigatória e sem autor identificável. Domínio público e CC0 ficam.
// Uso: pnpm tsx --env-file-if-exists=.env.local scripts/manutencao/fotos-sem-autor.ts [--apagar]
import { clienteAdmin } from "../../lib/db/admin";

const apagar = process.argv.includes("--apagar");
const SEM_ATRIBUICAO = /public domain|domínio público|pd\b|^pd-|cc0/i;

const db = clienteAdmin();
const { data, error } = await db.from("midias").select("id, equipamento_slug, autor, licenca, fonte_url");
if (error) throw new Error(`consulta de midias: ${error.message}`);

const alvo = (data ?? []).filter(
  (m) => (!m.autor || /^autor não identificado/i.test(m.autor)) && !SEM_ATRIBUICAO.test(m.licenca),
);
console.log(`[fotos] ${data?.length ?? 0} fotos no banco; ${alvo.length} com licença que exige autor e sem autor:`);
for (const m of alvo) console.log(`  #${m.id} ${m.equipamento_slug} · ${m.licenca} · ${m.fonte_url}`);

if (apagar && alvo.length > 0) {
  const { error: e } = await db.from("midias").delete().in("id", alvo.map((m) => m.id));
  if (e) throw new Error(`remoção: ${e.message}`);
  console.log(`[fotos] ${alvo.length} removidas.`);
} else if (!apagar) {
  console.log("[fotos] modo de consulta: nada foi apagado (use --apagar).");
}
