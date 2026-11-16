// Gera content/arquivo/ucdp-series.json com as séries anuais do UCDP (conflitos desde 1946, mortes em combate desde 1989).
// O UCDP publica uma versão por ano; rode de novo quando sair a próxima (a página /arquivo mostra a versão em uso).
// Uso: pnpm arquivo:ucdp            (grava)
//      pnpm arquivo:ucdp --seco     (só mostra o resumo)
import { writeFileSync } from "node:fs";
import path from "node:path";
import { configFonte } from "../../lib/fontes/_base/config";
import { buscarSeries, ID } from "../../lib/fontes/ucdp-series";

const seco = process.argv.includes("--seco");
const fonte = configFonte(ID);
const series = await buscarSeries({ limite: fonte.limite });
const ultimo = series.conflitos.at(-1);
const pico = series.conflitos.reduce((a, b) => (b.total > a.total ? b : a));
console.log(`[ucdp-series] versão ${series.versao}: conflitos ${series.conflitos[0]?.ano}–${ultimo?.ano}, mortes ${series.mortes[0]?.ano}–${series.mortes.at(-1)?.ano}`);
console.log(`[ucdp-series] último ano: ${ultimo?.total} conflitos (${ultimo?.guerras} com 1.000+ mortes); pico: ${pico.total} em ${pico.ano}; linhas ignoradas: ${series.ignoradas}`);
if (seco) process.exit(0);
const destino = path.join(process.cwd(), "content/arquivo/ucdp-series.json");
writeFileSync(destino, JSON.stringify(series, null, 2) + "\n");
console.log(`[ucdp-series] gravado em ${path.relative(process.cwd(), destino)}`);
