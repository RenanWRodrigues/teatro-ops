import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import { Suspense } from "react";
import { AvisoExemplo } from "@/components/AvisoExemplo";
import { Cabecalho } from "@/components/Cabecalho";
import { ComparadorArsenal } from "@/components/ComparadorArsenal";
import { Rodape } from "@/components/Rodape";
import { RotuloSecao } from "@/components/RotuloSecao";
import { obterEquipamentos } from "@/lib/dados";

export const metadata: Metadata = metadados({
  titulo: "Comparar equipamentos",
  descricao: "Compare dois equipamentos militares lado a lado, só com especificações que têm fonte nos dois.",
  caminho: "/arsenal/comparar",
});

export default async function Page() {
  const { dados, exemplo } = await obterEquipamentos();
  return (
    <>
      <Cabecalho trilha={[{ rotulo: "Arsenal", href: "/arsenal" }, { rotulo: "Comparar" }]} />
      {exemplo ? <AvisoExemplo /> : null}
      <main id="conteudo" tabIndex={-1}>
        <section className="malha-tatica border-b border-line">
          <div className="container-ops pt-14 pb-12 md:pt-[72px]">
            <RotuloSecao>Arsenal · Comparador</RotuloSecao>
            <h1 className="mt-3.5 font-display text-[clamp(48px,8vw,112px)] leading-[0.9] font-extrabold uppercase">Comparar</h1>
            <p className="mt-6 max-w-[760px] text-lg leading-relaxed text-text-2">
              Barras proporcionais ao maior valor de cada linha. Entram só as especificações que os dois equipamentos têm com fonte e na
              mesma unidade; valores são aproximados, de fontes abertas.
            </p>
          </div>
        </section>
        <section className="container-ops py-12">
          {/* useSearchParams exige um limite de Suspense para a página continuar estática. */}
          <Suspense fallback={<p className="font-mono text-sm text-muted">Carregando comparador…</p>}>
            <ComparadorArsenal equipamentos={dados} />
          </Suspense>
        </section>
      </main>
      <Rodape nota="Especificações aproximadas, de fontes abertas. Cada ficha lista suas referências." />
    </>
  );
}
