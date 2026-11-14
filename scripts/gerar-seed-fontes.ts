// Gera supabase/seed.sql a partir de config/fontes.yaml.
// Uso: pnpm db:seed:gerar   (também roda dentro de pnpm db:migrate)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gerarSeedSql, lerRegistroFontes } from "../lib/fontes/registro";

const raiz = path.join(import.meta.dirname, "..");
const { fontes, ignoradas } = lerRegistroFontes(readFileSync(path.join(raiz, "config/fontes.yaml"), "utf8"));

writeFileSync(path.join(raiz, "supabase/seed.sql"), gerarSeedSql(fontes));
console.log(`[seed] ${fontes.length} fontes escritas em supabase/seed.sql`);
for (const i of ignoradas) console.log(`[seed] ignorada: ${i.id} (${i.motivo})`);
