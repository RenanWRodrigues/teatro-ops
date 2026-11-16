import Link from "next/link";
import type { Conflito } from "@/lib/tipos";
import { CreditoFonte } from "./CreditoFonte";
import { SeloIntensidade } from "./SeloIntensidade";

type Props = { conflito: Conflito; href?: string };

/**
 * Card de conflito. Com `href`, o link fica só no título e cobre o card pelo ::after; o crédito da fonte
 * (que tem links próprios) fica acima dessa camada — link dentro de link é HTML inválido (WCAG 4.1.2).
 */
export function CardConflito({ conflito, href }: Props) {
  return (
    <article className={`relative flex flex-col gap-2 border-b border-line p-6 text-text last:border-b-0 ${href ? "hover:bg-surface" : ""}`}>
      <SeloIntensidade intensidade={conflito.intensidade} regiao={conflito.regiao} />
      <h3 className="font-display text-[28px] leading-none font-bold uppercase">
        {href ? (
          <Link href={href} className="after:absolute after:inset-0 hover:text-accent">
            {conflito.nome}
          </Link>
        ) : (
          conflito.nome
        )}
      </h3>
      <p className="text-sm leading-normal text-muted">{conflito.resumo}</p>
      <CreditoFonte fonte={conflito.fonte} className="relative z-10 text-[11px]" />
    </article>
  );
}
