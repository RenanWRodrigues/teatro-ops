// Grava um equipamento montado por `montarEquipamento` (upsert da ficha; fotos substituídas).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinhaEquipamentoNova, LinhaMidiaNova } from "./cadastro";

export async function gravarEquipamento(db: SupabaseClient, linha: LinhaEquipamentoNova, midias: LinhaMidiaNova[]): Promise<void> {
  const r = await db.from("equipamentos").upsert(linha, { onConflict: "slug" });
  if (r.error) throw new Error(`equipamentos (${linha.slug}): ${r.error.message}`);
  // Sem fotos novas (Commons fora do ar, por exemplo), mantém as antigas em vez de deixar a galeria vazia.
  if (midias.length === 0) return;
  const del = await db.from("midias").delete().eq("equipamento_slug", linha.slug);
  if (del.error) throw new Error(`midias (limpar ${linha.slug}): ${del.error.message}`);
  const ins = await db.from("midias").insert(midias);
  if (ins.error) throw new Error(`midias (${linha.slug}): ${ins.error.message}`);
}
