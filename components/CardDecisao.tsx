import { formatarData } from "@/lib/format";
import { rotuloTipo } from "@/lib/governos/classificacao";
import { paisPorCodigo } from "@/lib/governos/paises";
import type { Decisao } from "@/lib/tipos";
import { Bandeira } from "./Bandeira";
import { CreditoFonte } from "./CreditoFonte";
import { SeloEstatal } from "./SeloEstatal";

const IDIOMAS: Record<string, string> = { en: "inglês", de: "alemão", ru: "russo", zh: "chinês", fa: "persa", he: "hebraico", uk: "ucraniano", fr: "francês" };

type Props = {
  decisao: Decisao;
  /** Esconde bandeira e país (na página do próprio país). */
  semPais?: boolean;
  /** Nível do título (h3 nas listas, h4 dentro de grupos por dia). */
  nivel?: "h3" | "h4";
};

/**
 * Decisão ou comunicado oficial. Mesma estrutura para todos os países (skill monitor-governos):
 * bandeira, órgão, tipo, título em pt-BR atribuído ao órgão, resumo próprio, data, link para o documento
 * oficial e selo "Mídia estatal" quando for o caso.
 */
export function CardDecisao({ decisao: d, semPais, nivel = "h3" }: Props) {
  const Titulo = nivel;
  const pais = paisPorCodigo(d.pais);
  return (
    <article className="flex flex-col gap-2.5 border-b border-line p-6 last:border-b-0">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] tracking-[0.12em] uppercase">
        {semPais ? null : (
          <span className="inline-flex items-center gap-2 text-text-2">
            <Bandeira pais={d.pais} className="h-3.5 w-[21px]" />
            {pais?.nome ?? d.pais}
          </span>
        )}
        <span className="text-accent">{rotuloTipo(d)}</span>
        <time dateTime={d.publicadoEm} className="text-muted">
          {formatarData(d.publicadoEm)}
        </time>
        {d.estatal ? <SeloEstatal /> : null}
      </p>
      {/* Atribuição explícita: o título é a versão do órgão, não um fato verificado pelo portal. */}
      <p className="text-sm text-text-3">
        <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">Publicado por · </span>
        <span className="text-text-2">{d.orgao}</span>
      </p>
      <Titulo className="text-lg leading-snug font-semibold">
        <a
          href={d.urlOficial}
          lang={d.traducaoPendente ? (d.idiomaOriginal ?? undefined) : undefined}
          className="text-text hover:text-accent"
          rel="noopener noreferrer"
          target="_blank"
        >
          {d.titulo}
          <span className="sr-only">{d.estatal ? " (texto da agência, abre em nova aba)" : " (documento oficial, abre em nova aba)"}</span>
        </a>
      </Titulo>
      {d.traducaoPendente ? (
        <p className="font-mono text-[11px] text-text-2">TRADUÇÃO PENDENTE — título no idioma original</p>
      ) : d.idiomaOriginal !== "pt" ? (
        // Tradução é alteração: a CC BY e a transparência pedem que o original fique a um clique.
        <details className="font-mono text-[11px] text-muted">
          <summary className="inline-flex min-h-6 cursor-pointer items-center hover:text-accent">
            Título traduzido automaticamente{IDIOMAS[d.idiomaOriginal ?? ""] ? ` do ${IDIOMAS[d.idiomaOriginal ?? ""]}` : ""} · ver original
          </summary>
          <p lang={d.idiomaOriginal ?? undefined} className="mt-1.5 font-sans text-sm text-text-3">
            {d.tituloOriginal}
          </p>
        </details>
      ) : null}
      {d.resumo ? (
        <p className="text-sm leading-normal text-muted">
          <span className="font-mono text-[11px] text-text-2">Classificação automática · </span>
          {d.resumo}
        </p>
      ) : null}
      <p className="font-mono text-[11px] text-muted">
        <CreditoFonte fonte={d.fonte} prefixo={d.estatal ? "Fonte" : "Documento oficial"} className="text-[11px]" />
        {d.via ? (
          <>
            {" · via "}
            <a href={d.via.url ?? undefined} className="text-text-2 underline underline-offset-2 hover:text-accent" rel="noopener noreferrer" target="_blank">
              {d.via.nome}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </>
        ) : null}
      </p>
    </article>
  );
}
