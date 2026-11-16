import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { CardNoticia } from "@/components/CardNoticia";
import { Cabecalho } from "@/components/Cabecalho";
import { FichaTecnica } from "@/components/FichaTecnica";
import { FotoCreditada } from "@/components/FotoCreditada";
import { ListaFontes } from "@/components/ListaFontes";
import { RefFonte } from "@/components/RefFonte";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { chaveFonte, fontesUnicas, formatarEspecificacao } from "@/lib/especificacao";
import { DetalheFonte } from "@/components/CreditoFonte";
import { obterEquipamento, obterEquipamentos, obterNoticiasEquipamento } from "@/lib/dados";
import { CATEGORIAS, type Equipamento, type Especificacao, type Fonte, type Manchete } from "@/lib/tipos";

type Params = PageProps<"/arsenal/[categoria]/[slug]">["params"];

export async function generateStaticParams() {
  const { dados } = await obterEquipamentos();
  return dados.map((e) => ({ categoria: e.categoria, slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { categoria, slug } = await params;
  const { dados: e } = await obterEquipamento(categoria, slug);
  if (!e) return {};
  return metadados({ titulo: `${e.nome} — ficha técnica`, descricao: e.descricao, caminho: `/arsenal/${categoria}/${slug}` });
}

const textoSpec = formatarEspecificacao;

/** Todas as fontes usadas na ficha, numeradas na ordem em que aparecem. */
function montarReferencias(e: Equipamento) {
  const lista = fontesUnicas([
    ...(e.resumo ? [e.resumo.fonte] : []),
    ...(e.estatisticas ?? []).map((s) => s.spec.fonte),
    ...(e.planta ? [e.planta.comprimento.fonte, e.planta.envergadura.fonte] : []),
    ...(e.ficha ?? []).map((i) => i.fonte),
    ...(e.fontes ?? []),
  ]);
  const indice = new Map(lista.map((f, i) => [chaveFonte(f), i + 1]));
  return { lista, numero: (f: Fonte) => indice.get(chaveFonte(f)) ?? 0 };
}

// `params` é aguardado fora de <Suspense> para que slugs inexistentes devolvam 404 real (ver next.config.ts).
export default async function Page({ params }: { params: Params }) {
  const { categoria, slug } = await params;
  const { dados: e, exemplo } = await obterEquipamento(categoria, slug);
  if (!e) notFound();
  // Notícias só para fichas reais: as fixtures [EXEMPLO] não têm termos de busca.
  const noticias = exemplo ? [] : await obterNoticiasEquipamento(e.slug);
  return <ConteudoFicha e={e} exemplo={exemplo} noticias={noticias} />;
}

type NoticiaFicha = Manchete & { resumo: string | null };

function ConteudoFicha({ e, exemplo, noticias }: { e: Equipamento; exemplo: boolean; noticias: NoticiaFicha[] }) {
  const primeira = e.galeria?.[0];
  const capa = primeira && primeira.url !== null ? primeira : null;
  const categoria = CATEGORIAS[e.categoria];
  const refs = montarReferencias(e);
  // Nome em duas linhas como na referência: designação + apelido ("F-35A" / "Lightning II").
  const [designacao, ...apelido] = e.nome.split(" ");

  return (
    <>
      <Cabecalho
        trilha={[
          { rotulo: "Arsenal", href: "/arsenal" },
          { rotulo: categoria, href: `/arsenal/${e.categoria}` },
          { rotulo: designacao ?? e.nome },
        ]}
      />
      {exemplo ? <AvisoExemplo /> : null}
      <main id="conteudo" tabIndex={-1}>
        {/* HERO */}
        <section className="border-b border-line">
          <div className={`relative flex min-h-[480px] items-end md:min-h-[620px] ${capa ? "bg-surface-2" : "placeholder-listrado"}`}>
            {capa ? (
              <>
                <Image src={capa.url} alt={capa.legenda} fill priority sizes="100vw" className="object-cover" />
                {/* Escurece a base da foto para o título manter contraste AA. */}
                <div aria-hidden="true" className="absolute inset-0 bg-bg/60" />
                <p className="absolute top-4 right-4 left-4 text-right font-mono text-[11px] leading-snug text-text-3 md:right-10">
                  Foto: {capa.autor} · <DetalheFonte fonte={{ nome: capa.licenca, url: capa.licencaUrl ?? capa.fonteUrl }} /> ·{" "}
                  <a href={capa.fonteUrl} className="text-text-2 underline underline-offset-2 hover:text-accent" rel="noopener noreferrer" target="_blank">
                    Wikimedia Commons<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </p>
              </>
            ) : (
              <span className="absolute top-8 right-4 font-mono text-xs tracking-[0.1em] text-muted md:right-10">SEM FOTO DE LICENÇA LIVRE</span>
            )}
            <div className="relative container-ops pb-14">
              <ul className="mb-5 flex flex-wrap gap-2.5 font-mono text-xs tracking-[0.12em] uppercase">
                <li className="bg-accent px-3 py-2 text-bg">{e.classe ?? categoria}</li>
                <li className="border border-line-strong bg-bg px-3 py-2">
                  {[e.paises.join(" · "), e.fabricante].filter(Boolean).join(" · ")}
                </li>
                {e.emServico !== undefined ? (
                  <li className="border border-line-strong bg-bg px-3 py-2">{e.emServico ? "Em serviço" : "Fora de serviço"}</li>
                ) : null}
              </ul>
              <h1 className="font-display text-[clamp(56px,11vw,168px)] leading-[0.85] font-extrabold uppercase [overflow-wrap:anywhere]">
                {apelido.length > 0 ? (
                  <>
                    {designacao}
                    <br />
                    <span className="text-accent">{apelido.join(" ")}</span>
                  </>
                ) : (
                  e.nome
                )}
              </h1>
            </div>
          </div>
        </section>

        {/* ESTATÍSTICAS-CHAVE */}
        {e.estatisticas && e.estatisticas.length > 0 ? (
          <section aria-label="Números principais" className="border-b border-line">
            <dl className="mx-auto grid max-w-[1360px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
              {e.estatisticas.map((s) => (
                <div key={s.rotulo} className="border-b border-line px-4 py-8 sm:border-r md:px-10 sm:last:border-r-0">
                  <dt className="font-mono text-xs tracking-[0.12em] text-muted uppercase">{s.rotulo}</dt>
                  <dd className={`mt-1.5 font-display text-[56px] leading-none font-extrabold ${s.realce ? "text-accent" : ""}`}>
                    {textoSpec(s.spec)}
                    <RefFonte numero={refs.numero(s.spec.fonte)} className="text-xs" />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {/* CORPO */}
        <section>
          <div className="container-ops flex flex-wrap gap-14 py-16 md:py-20">
            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-14">
              <div>
                <RotuloSecao>Visão geral</RotuloSecao>
                <p className="mt-[18px] max-w-[760px] text-xl leading-[1.65] text-text-2">{e.resumo?.texto ?? `${e.descricao}.`}</p>
                {e.resumo ? (
                  <p className="mt-3 font-mono text-xs text-muted">
                    Fonte: {e.resumo.fonte.nome}
                    <RefFonte numero={refs.numero(e.resumo.fonte)} />
                  </p>
                ) : null}
              </div>

              {e.planta ? (
                <Planta forma={e.planta.forma ?? "aeronave"} comprimento={e.planta.comprimento} envergadura={e.planta.envergadura} referencia={refs.numero} />
              ) : null}

              {e.variantes && e.variantes.length > 0 ? (
                <div>
                  <RotuloSecao className="mb-[18px]">Variantes do programa</RotuloSecao>
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-px border border-line bg-line">
                    {e.variantes.map((v) => (
                      <li key={v.nome} className={v.atual ? "border-t-[3px] border-accent bg-surface-accent p-6" : "bg-bg p-6"}>
                        <p className="font-display text-4xl font-extrabold">{v.nome}</p>
                        <p className={`mt-1.5 text-sm ${v.atual ? "text-text-3" : "text-muted"}`}>{v.descricao}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {e.galeria && e.galeria.length > 0 ? (
                <div>
                  <RotuloSecao className="mb-[18px]">Galeria</RotuloSecao>
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3">
                    {e.galeria.map((m) => (
                      <li key={m.legenda}>
                        <FotoCreditada midia={m} />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 font-mono text-xs text-muted">
                    Só exibimos fotos de domínio público ou com licença livre, com autor e licença.
                  </p>
                </div>
              ) : null}

              {!exemplo ? (
                <div>
                  <RotuloSecao className="mb-[18px]">Notícias relacionadas</RotuloSecao>
                  {noticias.length > 0 ? (
                    <div className="border border-line">
                      {noticias.map((n) => (
                        <CardNoticia key={n.url} noticia={n} />
                      ))}
                    </div>
                  ) : (
                    <p className="border border-line p-6 text-sm text-muted">Nenhuma notícia recente coletada cita este equipamento no título.</p>
                  )}
                </div>
              ) : null}
            </div>

            {/* FICHA */}
            <aside aria-label="Especificações" className="min-w-0 flex-[1_1_360px]">
              <div className="border border-line-panel bg-surface">
                <FichaTecnica itens={e.ficha ?? []} referencia={refs.numero} />
                <div className="flex flex-col gap-2.5 border-t border-line px-[22px] py-[18px]">
                  <Link
                    href={`/arsenal/comparar?a=${e.slug}`}
                    className="flex h-12 items-center justify-center bg-accent text-center font-display text-lg font-bold tracking-[0.06em] text-bg uppercase hover:bg-accent-hover"
                  >
                    + Comparar com outro equipamento
                  </Link>
                  <a
                    href="#fontes"
                    className="flex h-12 items-center justify-center border border-line-strong font-display text-lg font-bold tracking-[0.06em] text-text uppercase hover:border-accent hover:text-accent"
                  >
                    Ver fontes
                  </a>
                </div>
              </div>
              {e.operadores && e.operadores.length > 0 ? (
                <div className="mt-5 border border-line p-[22px]">
                  <h2 className="mb-3.5 font-mono text-xs tracking-[0.14em] text-muted">OPERADORES</h2>
                  <ul className="flex flex-wrap gap-2 font-mono text-xs uppercase">
                    {e.operadores.map((o) => (
                      <li key={o} className="border border-line-strong px-2.5 py-1.5">
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>
        </section>

        <section id="fontes" aria-labelledby="titulo-fontes" className="scroll-mt-4 border-t border-line">
          <div className="container-ops py-10">
            <h2 id="titulo-fontes" className="mb-3 font-mono text-xs tracking-[0.14em] text-accent">
              FONTES
            </h2>
            {refs.lista.length > 0 ? (
              <ListaFontes fontes={refs.lista} variante="numerada" />
            ) : (
              <p className="font-mono text-xs text-muted">Ainda sem fontes registradas.</p>
            )}
            <p className="mt-3 font-mono text-xs text-muted">Valores aproximados de fontes abertas.</p>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}

function Planta({
  forma,
  comprimento,
  envergadura,
  referencia,
}: {
  forma: "aeronave" | "casco";
  comprimento: Especificacao;
  envergadura: Especificacao;
  referencia: (f: Fonte) => number;
}) {
  if (forma === "casco") return <PlantaCasco comprimento={comprimento} largura={envergadura} referencia={referencia} />;
  return (
    <figure className="border border-line bg-surface">
      <figcaption className="flex justify-between gap-4 border-b border-line px-5 py-3.5 font-mono text-xs tracking-[0.1em] text-muted">
        <span>PLANTA · VISTA SUPERIOR</span>
        <span>ESCALA ILUSTRATIVA</span>
      </figcaption>
      <div className="malha-tatica-fina p-4 md:p-8">
        <svg
          viewBox="0 0 600 320"
          className="h-auto w-full"
          role="img"
          aria-label={`Silhueta esquemática com comprimento de ${textoSpec(comprimento)} e envergadura de ${textoSpec(envergadura)}`}
        >
          <g fill="none" stroke="var(--accent)" strokeWidth="2">
            <path d="M300 20 L316 90 L322 140 L470 210 L470 228 L330 214 L334 260 L372 284 L372 296 L310 290 L300 300 L290 290 L228 296 L228 284 L266 260 L270 214 L130 228 L130 210 L278 140 L284 90 Z" />
            <path d="M300 60 L300 120" strokeOpacity="0.5" />
          </g>
          <g stroke="var(--neutral-bar)" strokeWidth="1" fill="none">
            <path d="M530 20v280M522 20h16M522 300h16" />
            <path d="M130 250h340" strokeDasharray="4 4" />
          </g>
          <g fontFamily="var(--font-jetbrains), monospace" fontSize="13" fill="var(--text-2)">
            <text x="545" y="165">
              {textoSpec(comprimento)}
            </text>
            <text x="268" y="246">
              {textoSpec(envergadura)}
            </text>
          </g>
        </svg>
      </div>
      <p className="border-t border-line px-5 py-3 font-mono text-xs text-muted">
        Comprimento {textoSpec(comprimento)}
        <RefFonte numero={referencia(comprimento.fonte)} /> · envergadura {textoSpec(envergadura)}
        <RefFonte numero={referencia(envergadura.fonte)} />
      </p>
    </figure>
  );
}

/** Planta genérica de casco ou chassi (navios, blindados): retângulo proporcional, comprimento × largura. */
function PlantaCasco({ comprimento, largura, referencia }: { comprimento: Especificacao; largura: Especificacao; referencia: (f: Fonte) => number }) {
  // Proporção real limitada para caber no quadro (um porta-aviões tem ~4:1; um tanque, ~2:1).
  const razao = Math.min(Math.max(comprimento.valor / largura.valor, 1.2), 5);
  const w = 440;
  const h = Math.round(w / razao);
  const x = (600 - w) / 2;
  const y = (320 - h) / 2;
  return (
    <figure className="border border-line bg-surface">
      <figcaption className="flex justify-between gap-4 border-b border-line px-5 py-3.5 font-mono text-xs tracking-[0.1em] text-muted">
        <span>PLANTA · VISTA SUPERIOR</span>
        <span>ESQUEMA GENÉRICO</span>
      </figcaption>
      <div className="malha-tatica-fina p-4 md:p-8">
        <svg
          viewBox="0 0 600 320"
          className="h-auto w-full"
          role="img"
          aria-label={`Contorno esquemático com comprimento de ${textoSpec(comprimento)} e largura de ${textoSpec(largura)}`}
        >
          <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--accent)" strokeWidth="2" />
          <g stroke="var(--neutral-bar)" strokeWidth="1" fill="none">
            <path d={`M${x} ${y + h + 22}h${w}M${x} ${y + h + 14}v16M${x + w} ${y + h + 14}v16`} />
            <path d={`M${x + w + 22} ${y}v${h}M${x + w + 14} ${y}h16M${x + w + 14} ${y + h}h16`} />
          </g>
          <g fontFamily="var(--font-jetbrains), monospace" fontSize="13" fill="var(--text-2)">
            <text x={300} y={Math.min(y + h + 42, 314)} textAnchor="middle">
              {textoSpec(comprimento)}
            </text>
            <text x={Math.min(x + w + 30, 560)} y={160}>
              {textoSpec(largura)}
            </text>
          </g>
        </svg>
      </div>
      <p className="border-t border-line px-5 py-3 font-mono text-xs text-muted">
        Comprimento {textoSpec(comprimento)}
        <RefFonte numero={referencia(comprimento.fonte)} /> · largura {textoSpec(largura)}
        <RefFonte numero={referencia(largura.fonte)} />
      </p>
    </figure>
  );
}
