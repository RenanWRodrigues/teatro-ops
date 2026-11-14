import Image from "next/image";
import type { Midia } from "@/lib/tipos";
import { DetalheFonte } from "./CreditoFonte";
import { Placeholder } from "./Placeholder";

type Props = {
  midia: Midia;
  /** Classe de altura do quadro (a imagem preenche o quadro). */
  className?: string;
  sizes?: string;
};

/**
 * Foto com autor e licença sempre visíveis (CLAUDE.md §1.4).
 * Sem foto livre disponível, mostra o placeholder do design system.
 */
export function FotoCreditada({ midia, className = "h-40", sizes = "(min-width: 768px) 25vw, 100vw" }: Props) {
  if (midia.url === null) {
    return <Placeholder rotulo={`FOTO · ${midia.legenda}`} className={className} />;
  }
  return (
    <figure>
      <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
        <Image src={midia.url} alt={midia.legenda} fill sizes={sizes} className="object-cover" />
      </div>
      <figcaption className="mt-1.5 font-mono text-[11px] leading-snug text-muted">
        {midia.legenda} · {midia.autor} ·{" "}
        <DetalheFonte fonte={{ nome: midia.licenca, url: midia.licencaUrl ?? midia.fonteUrl }} />
      </figcaption>
    </figure>
  );
}
