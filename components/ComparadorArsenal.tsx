"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { linhasComparaveis } from "@/lib/arsenal/comparar";
import { CATEGORIAS, type Equipamento } from "@/lib/tipos";
import { BarraComparacao } from "./BarraComparacao";
import { hrefEquipamento } from "./CardEquipamento";

type Props = { equipamentos: Equipamento[] };

const CAMPO = "h-12 w-full border border-line-field bg-surface-3 px-3 font-mono text-[13px] text-text";

/** Escolha de dois equipamentos (estado na URL: ?a=&b=, para compartilhar) e barras proporcionais. */
export function ComparadorArsenal({ equipamentos }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const caminho = usePathname();
  const porSlug = new Map(equipamentos.map((e) => [e.slug, e]));
  // A escolha vive no estado (lido da URL na entrada) e é espelhada na URL para compartilhar.
  // Ler de volta da URL a cada troca perderia a primeira escolha: router.replace é assíncrono.
  const [slugs, setSlugs] = useState({ a: params.get("a") ?? "", b: params.get("b") ?? "" });
  const a = porSlug.get(slugs.a) ?? null;
  const b = porSlug.get(slugs.b) ?? null;

  const mudar = (campo: "a" | "b", slug: string) => {
    const proximo = { ...slugs, [campo]: slug };
    setSlugs(proximo);
    const busca = new URLSearchParams();
    if (proximo.a) busca.set("a", proximo.a);
    if (proximo.b) busca.set("b", proximo.b);
    router.replace(`${caminho}?${busca.toString()}`, { scroll: false });
  };

  // Agrupa as opções por categoria (comparar caça com caça é o caso comum, mas não é obrigatório).
  const grupos = Object.entries(CATEGORIAS).flatMap(([cat, rotulo]) => {
    const itens = equipamentos.filter((e) => e.categoria === cat);
    return itens.length ? [{ rotulo, itens }] : [];
  });

  const Seletor = (campo: "a" | "b", rotulo: string, atual: Equipamento | null) => (
    <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
      <label htmlFor={`comparar-${campo}`} className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
        {rotulo}
      </label>
      <select id={`comparar-${campo}`} value={atual?.slug ?? ""} onChange={(ev) => mudar(campo, ev.target.value)} className={CAMPO}>
        <option value="">Escolha um equipamento…</option>
        {grupos.map((g) => (
          <optgroup key={g.rotulo} label={g.rotulo}>
            {g.itens.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.nome}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );

  const resultado = a && b ? linhasComparaveis(a, b) : null;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap gap-4">
        {Seletor("a", "Equipamento A", a)}
        {Seletor("b", "Equipamento B", b)}
      </div>

      {!a || !b ? (
        <p className="border border-line p-6 text-sm text-muted">Escolha dois equipamentos para comparar.</p>
      ) : a.slug === b.slug ? (
        <p className="border border-line p-6 text-sm text-muted">Escolha dois equipamentos diferentes.</p>
      ) : (
        <section aria-labelledby="titulo-resultado" className="flex flex-col gap-6">
          <h2 id="titulo-resultado" className="font-display text-[36px] leading-none font-extrabold uppercase md:text-[44px]">
            <Link href={hrefEquipamento(a)} className="text-accent hover:text-accent-hover">
              {a.nome}
            </Link>{" "}
            <span className="text-muted" aria-hidden="true">
              ×
            </span>
            <span className="sr-only">versus</span>{" "}
            <Link href={hrefEquipamento(b)} className="text-text hover:text-accent">
              {b.nome}
            </Link>
          </h2>
          {resultado && resultado.linhas.length > 0 ? (
            <BarraComparacao rotuloA={a.nome} rotuloB={b.nome} linhas={resultado.linhas} />
          ) : (
            <p className="border border-line p-6 text-sm text-muted">
              Os dois não têm nenhuma especificação numérica em comum com fonte e na mesma unidade.
            </p>
          )}
          {resultado && resultado.soDeUm.length > 0 ? (
            <p className="font-mono text-xs leading-relaxed text-muted">
              Fora da comparação (só um dos dois tem o dado com fonte, ou as unidades diferem): {resultado.soDeUm.join(", ")}.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
