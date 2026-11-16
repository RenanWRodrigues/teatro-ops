import Image from "next/image";
import Link from "next/link";
import { CATEGORIAS, type Equipamento } from "@/lib/tipos";
import { Placeholder } from "./Placeholder";

export function hrefEquipamento(e: Pick<Equipamento, "categoria" | "slug">) {
  return `/arsenal/${e.categoria}/${e.slug}`;
}

type Props = { equipamento: Equipamento };

/** Card do catálogo do arsenal. */
function SeloCategoria({ categoria }: { categoria: Equipamento["categoria"] }) {
  return (
    <span className="absolute top-3.5 left-3.5 border border-line-strong bg-bg px-2.5 py-1.5 font-mono text-[11px] tracking-[0.12em] text-accent uppercase">
      {CATEGORIAS[categoria]}
    </span>
  );
}

export function CardEquipamento({ equipamento: e }: Props) {
  const primeira = e.galeria?.[0];
  const capa = primeira && primeira.url !== null ? primeira : null;
  return (
    <Link href={hrefEquipamento(e)} className="group flex w-full flex-col border border-line bg-surface text-text hover:border-line-strong">
      {capa ? (
        <div className="relative h-[200px] overflow-hidden border-b border-line bg-surface-2">
          <Image src={capa.url} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
          <SeloCategoria categoria={e.categoria} />
          {/* Crédito sempre visível (CLAUDE.md §1.4); o link para o arquivo fica na galeria da ficha. */}
          <span className="absolute right-0 bottom-0 left-0 bg-bg/85 px-2.5 py-1 font-mono text-[10px] leading-snug text-text-3">
            Foto: {capa.autor} · {capa.licenca}
          </span>
        </div>
      ) : (
        <Placeholder rotulo={`FOTO · ${e.nome}`} className="h-[200px] border-b border-line">
          <SeloCategoria categoria={e.categoria} />
        </Placeholder>
      )}
      <div className="flex flex-col gap-2 px-[22px] pt-[22px] pb-6">
        <h3 className="font-display text-[30px] leading-none font-bold uppercase group-hover:text-accent">{e.nome}</h3>
        <p className="text-sm text-muted">{e.descricao}</p>
        <div className="mt-3 flex justify-between gap-3 border-t border-line pt-3.5 font-mono text-xs">
          <span className="text-text-3 uppercase">{e.paises.join(" · ")}</span>
          <span className="text-right text-accent">{e.destaque}</span>
        </div>
      </div>
    </Link>
  );
}
