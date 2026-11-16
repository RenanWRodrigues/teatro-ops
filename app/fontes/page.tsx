import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { TituloSecao } from "@/components/TituloSecao";
import { formatarNumero } from "@/lib/format";
import { listarFontesPublicas, type FontePublica } from "@/lib/fontes/publico";

export const metadata: Metadata = metadados({
  titulo: "Fontes de dados",
  descricao: "Todas as fontes usadas pelo TEATRO//OPS, com licença, frequência de atualização e situação de cada uma.",
  caminho: "/fontes",
});

const COR_STATUS: Record<FontePublica["status"], string> = {
  ativa: "border-accent text-accent",
  a_verificar: "border-line-strong text-text-2",
  quebrada: "border-alert text-alert-text",
  desativada: "border-line text-muted",
};

function CartaoFonte({ f }: { f: FontePublica }) {
  return (
    <li className="flex flex-col gap-3 bg-bg p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h3 className="min-w-0 text-base leading-snug font-semibold [overflow-wrap:anywhere]">
          {f.link ? (
            <a href={f.link} className="underline underline-offset-2 hover:text-accent" rel="noopener noreferrer" target="_blank">
              {f.nome}
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          ) : (
            f.nome
          )}
        </h3>
        <span className={`shrink-0 border px-2 py-0.5 font-mono text-[11px] tracking-[0.06em] uppercase ${COR_STATUS[f.status]}`}>
          {f.rotuloStatus}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs leading-relaxed">
        <dt className="text-muted">Licença</dt>
        <dd className="text-text-2 [overflow-wrap:anywhere]">{f.licenca}</dd>
        <dt className="text-muted">Tipo</dt>
        <dd className="text-text-2">
          {f.categoria} · {f.tipo}
        </dd>
        <dt className="text-muted">Atualização</dt>
        <dd className="text-text-2">{f.frequencia}</dd>
        {f.pais ? (
          <>
            <dt className="text-muted">País</dt>
            <dd className="text-text-2">{f.pais}</dd>
          </>
        ) : null}
      </dl>
    </li>
  );
}

export default function Page() {
  const secoes = listarFontesPublicas(readFileSync(path.join(process.cwd(), "config/fontes.yaml"), "utf8"));
  const todas = secoes.flatMap((s) => s.fontes);
  const ativas = todas.filter((f) => f.status === "ativa").length;

  return (
    <>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Transparência</RotuloSecao>
            <TituloSecao como="h1" tamanho="hero" className="mt-3.5">
              Fontes de dados
            </TituloSecao>
            <p className="mt-6 max-w-[720px] text-lg leading-relaxed text-text-2">
              Todas as fontes de dados coletadas automaticamente pelo TEATRO//OPS, inclusive as que ainda estão em verificação
              ou fora do ar. Hoje,{" "}
              {formatarNumero(ativas)} de {formatarNumero(todas.length)} estão coletando dados. As fontes dos textos editoriais
              (táticas, dossiê de tecnologia, arquivo) aparecem numeradas no rodapé de cada texto. Como cada fonte é usada está em{" "}
              <Link href="/metodologia" className="underline underline-offset-2 hover:text-accent">
                Metodologia
              </Link>
              .
            </p>
            <p className="mt-4 max-w-[720px] font-mono text-xs leading-relaxed text-muted">
              Lista gerada automaticamente do registro de fontes do projeto (config/fontes.yaml). “Em verificação”: integração
              ainda não confirmada ou à espera de credencial. “Fora do ar”: o serviço não respondeu como documentado.
            </p>
          </div>
        </section>

        {secoes.map((s) => (
          <section key={s.id} aria-labelledby={`secao-${s.id}`} className="border-b border-line">
            <div className="container-ops py-14">
              <h2 id={`secao-${s.id}`} className="font-display text-[32px] leading-none font-extrabold uppercase md:text-[44px]">
                {s.titulo}
              </h2>
              {s.fontes.length === 0 ? (
                <p className="mt-6 border border-line bg-surface px-6 py-5 text-base text-text-2">
                  Nenhuma fonte integrada ainda nesta categoria.
                </p>
              ) : (
                <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-px border border-line bg-line">
                  {s.fontes.map((f) => (
                    <CartaoFonte key={f.id} f={f} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </main>
      <Rodape />
    </>
  );
}
