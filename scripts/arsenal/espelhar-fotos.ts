// Copia para o Supabase Storage as fotos de `midias` que ainda apontam para o Wikimedia
// (lib/imagens/espelho.ts explica o porquê). Idempotente: as já copiadas são puladas.
//   pnpm arsenal:espelhar-fotos --seco   só conta o que seria copiado
//   pnpm arsenal:espelhar-fotos
import { parseArgs } from "node:util";
import { clienteAdmin } from "@/lib/db/admin";
import { rateLimiter } from "@/lib/fontes/_base/limitador";
import { ehEspelho, espelharFoto, garantirBucketFotos } from "@/lib/imagens/espelho";

type Linha = { id: number; url: string; miniatura_url: string | null; fonte_url: string };

const { values } = parseArgs({ options: { seco: { type: "boolean", default: false } } });
const db = clienteAdmin();

const r = await db.from("midias").select("id, url, miniatura_url, fonte_url").order("id");
if (r.error) throw new Error(`midias: ${r.error.message}`);
const pendentes = (r.data as Linha[]).filter((m) => !ehEspelho(m.miniatura_url));
console.log(`${r.data.length} foto(s); ${pendentes.length} sem cópia no Storage.`);
// exitCode em vez de process.exit: no Windows, sair com conexões abertas aborta o Node (libuv).
if (!values.seco && pendentes.length > 0) process.exitCode = await copiar(pendentes);

async function copiar(lista: Linha[]): Promise<number> {
  await garantirBucketFotos(db);
  // Mesmo ritmo do adaptador do Commons: 1 pedido por segundo.
  const esperar = rateLimiter("commons", "1 req / s");
  let ok = 0;
  const falhas: string[] = [];
  for (const m of lista) {
    await esperar();
    try {
      const copia = await espelharFoto(db, m.miniatura_url ?? m.url);
      const up = await db.from("midias").update({ miniatura_url: copia }).eq("id", m.id);
      if (up.error) throw new Error(up.error.message);
      ok++;
      console.log(`ok   ${m.fonte_url}`);
    } catch (e) {
      falhas.push(m.fonte_url);
      console.warn(`erro ${m.fonte_url}: ${(e as Error).message.slice(0, 160)}`);
    }
  }
  console.log(`\ncopiadas: ${ok} · falhas: ${falhas.length}${falhas.length ? " (rode de novo depois; as falhas seguem usando o Commons)" : ""}`);
  return falhas.length ? 1 : 0;
}
