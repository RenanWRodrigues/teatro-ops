import Link from "next/link";
import { CATEGORIAS, type Equipamento } from "@/lib/tipos";
import { Placeholder } from "./Placeholder";

export function hrefEquipamento(e: Pick<Equipamento, "categoria" | "slug">) {
  return `/arsenal/${e.categoria}/${e.slug}`;
}

type Props = { equipamento: Equipamento };

/** Card do catálogo do arsenal. */
export function CardEquipamento({ equipamento: e }: Props) {
  return (
    <Link href={hrefEquipamento(e)} className="group flex w-full flex-col border border-line bg-surface text-text hover:border-line-strong">
      <Placeholder rotulo={`FOTO · ${e.nome}`} className="h-[200px] border-b border-line">
        <span className="absolute top-3.5 left-3.5 border border-line-strong bg-bg px-2.5 py-1.5 font-mono text-[11px] tracking-[0.12em] text-accent uppercase">
          {CATEGORIAS[e.categoria]}
        </span>
      </Placeholder>
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
