// Grava um equipamento montado por `montarEquipamento` (upsert da ficha; fotos substituídas).
import type { SupabaseClient } from "@supabase/supabase-js";
import { espelharFoto, garantirBucketFotos } from "@/lib/imagens/espelho";
import type { LinhaEquipamentoNova, LinhaMidiaNova } from "./cadastro";

type Opcoes = {
  /** Copia cada foto para o Supabase Storage (padrão). Desligado nos testes. */
  espelhar?: (db: SupabaseClient, urlCommons: string) => Promise<string>;
  avisar?: (mensagem: string) => void;
};

/** Troca `miniatura_url` pela cópia no Storage; se a cópia falhar, mantém a miniatura do Commons e avisa. */
export async function espelharMidias(db: SupabaseClient, midias: LinhaMidiaNova[], opcoes: Opcoes = {}): Promise<LinhaMidiaNova[]> {
  const espelhar = opcoes.espelhar ?? espelharFoto;
  const avisar = opcoes.avisar ?? ((m: string) => console.warn(m));
  if (!opcoes.espelhar) await garantirBucketFotos(db);
  const saida: LinhaMidiaNova[] = [];
  for (const m of midias) {
    try {
      saida.push({ ...m, miniatura_url: await espelhar(db, m.miniatura_url ?? m.url) });
    } catch (e) {
      avisar(`[fotos] cópia falhou, usando o Commons (${m.fonte_url}): ${(e as Error).message}`);
      saida.push(m);
    }
  }
  return saida;
}

export async function gravarEquipamento(db: SupabaseClient, linha: LinhaEquipamentoNova, midias: LinhaMidiaNova[], opcoes: Opcoes = {}): Promise<void> {
  const r = await db.from("equipamentos").upsert(linha, { onConflict: "slug" });
  if (r.error) throw new Error(`equipamentos (${linha.slug}): ${r.error.message}`);
  // Sem fotos novas (Commons fora do ar, por exemplo), mantém as antigas em vez de deixar a galeria vazia.
  if (midias.length === 0) return;
  const comCopia = await espelharMidias(db, midias, opcoes);
  const del = await db.from("midias").delete().eq("equipamento_slug", linha.slug);
  if (del.error) throw new Error(`midias (limpar ${linha.slug}): ${del.error.message}`);
  const ins = await db.from("midias").insert(comCopia);
  if (ins.error) throw new Error(`midias (${linha.slug}): ${ins.error.message}`);
}
