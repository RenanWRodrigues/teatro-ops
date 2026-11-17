// Cadastra (ou atualiza) equipamentos de config/arsenal.yaml a partir do Wikidata, da Wikipedia e do Commons.
//   pnpm arsenal:cadastrar --slug f-35a-lightning-ii            prévia (não grava)
//   pnpm arsenal:cadastrar --slug f-35a-lightning-ii --gravar   grava em equipamentos + midias
//   pnpm arsenal:cadastrar --todos --gravar
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { lerListaArsenal, montarEquipamento } from "@/lib/arsenal/cadastro";
import { gravarEquipamento } from "@/lib/arsenal/gravar";
import { clienteAdmin } from "@/lib/db/admin";
import { criarClienteCommons } from "@/lib/fontes/commons";
import { criarClienteWikidata } from "@/lib/fontes/wikidata";
import { criarClienteWikipedia } from "@/lib/fontes/wikipedia";
import { formatarEspecificacao } from "@/lib/especificacao";
import { ROTULOS_SPEC } from "@/lib/db/esquemas";
import { criarDependenciasTraducao } from "@/lib/traducao";
import { traduzirLote } from "@/lib/traducao/traduzir";

const { values } = parseArgs({ options: { slug: { type: "string" }, todos: { type: "boolean", default: false }, gravar: { type: "boolean", default: false } } });
const lista = lerListaArsenal(readFileSync("config/arsenal.yaml", "utf8"));
const alvo = values.todos ? lista : lista.filter((e) => e.slug === values.slug);
if (alvo.length === 0) {
  console.error(`Uso: --slug <slug de config/arsenal.yaml> | --todos  [--gravar]. Slugs: ${lista.map((e) => e.slug).join(", ")}`);
  process.exit(2);
}

const db = clienteAdmin();
const { deps: traducao } = await criarDependenciasTraducao(db, (m) => console.log(`[traducao] ${m}`));
const deps = {
  wikidata: criarClienteWikidata(),
  wikipedia: criarClienteWikipedia(),
  commons: criarClienteCommons(),
  traduzir: (itens: Parameters<typeof traduzirLote>[0]) => traduzirLote(itens, traducao),
};

for (const e of alvo) {
  const { linha, midias, relatorio } = await montarEquipamento(e, deps);
  console.log(`\n══ ${linha.nome} (${linha.wikidata_id}) — ${linha.classe}`);
  console.log(`descrição: ${linha.descricao ?? "—"}`);
  console.log(`origem: ${linha.pais_origem.join(", ") || "—"} · em serviço: ${linha.em_servico ?? "—"} · fabricante: ${linha.fabricante ?? "—"}`);
  console.log(`resumo (${linha.wikipedia_pt ? `Wikipedia PT: ${linha.wikipedia_pt}` : linha.fontes.find((f) => /^Wikip[eé]dia/.test(f.nome))?.nome ?? "sem fonte"}):\n  ${linha.resumo_pt ?? "—"}`);
  console.log("specs:");
  for (const [k, s] of Object.entries(linha.specs)) {
    const valor = "texto" in s ? s.texto : formatarEspecificacao({ valor: s.valor, unidade: s.unidade, fonte: { nome: s.fonte, url: s.url } });
    console.log(`  ${(ROTULOS_SPEC[k] ?? k).padEnd(24)} ${valor.padEnd(28)} ← ${s.fonte} · ${s.url}`);
  }
  console.log(`variantes: ${linha.variantes.map((v) => `${v.nome} — ${v.descricao}`).join(" | ") || "—"}`);
  console.log(`operadores: ${linha.operadores.join(", ") || "—"}`);
  console.log("fotos:");
  for (const m of midias) console.log(`  ${m.licenca.padEnd(14)} ${m.autor.slice(0, 40).padEnd(40)} ${m.legenda_pt?.slice(0, 70) ?? "—"}  ${m.fonte_url}`);
  console.log(`vazios: ${relatorio.vazios.join(", ") || "nenhum"}`);
  for (const a of relatorio.avisos) console.log(`aviso: ${a}`);
  console.log(`DeepL: ${relatorio.caracteresDeepL} caracteres`);

  if (values.gravar) {
    await gravarEquipamento(db, linha, midias);
    console.log(`gravado: ${linha.slug} + ${midias.length} foto(s)`);
  } else console.log("(prévia: nada gravado; use --gravar)");
}
