import type { Conflito } from "@/lib/tipos";
import { CreditoFonte } from "./CreditoFonte";
import { SeloIntensidade } from "./SeloIntensidade";

type Props = { conflito: Conflito; href?: string };

export function CardConflito({ conflito, href }: Props) {
  const conteudo = (
    <>
      <SeloIntensidade intensidade={conflito.intensidade} regiao={conflito.regiao} />
      <h3 className="font-display text-[28px] leading-none font-bold uppercase">{conflito.nome}</h3>
      <p className="text-sm leading-normal text-muted">{conflito.resumo}</p>
      <CreditoFonte fonte={conflito.fonte} className="text-[11px]" />
    </>
  );
  const classes = "flex flex-col gap-2 border-b border-line p-6 text-text last:border-b-0";
  return href ? (
    <a href={href} className={`${classes} hover:bg-surface`}>
      {conteudo}
    </a>
  ) : (
    <article className={classes}>{conteudo}</article>
  );
}
