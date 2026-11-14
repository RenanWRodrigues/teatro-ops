import { CATEGORIAS, type Categoria } from "@/lib/tipos";
import { obterEquipamentos } from "@/lib/dados";
import { categoriasComItens } from "@/lib/fixtures/equipamentos";
import { AvisoExemplo } from "./AvisoExemplo";
import { Cabecalho } from "./Cabecalho";
import { CatalogoArsenal } from "./CatalogoArsenal";
import { Rodape } from "./Rodape";
import { RotuloSecao } from "./RotuloSecao";

/** Página do catálogo, compartilhada por /arsenal e /arsenal/[categoria]. */
export async function PaginaArsenal({ categoria }: { categoria?: Categoria }) {
  const { dados, exemplo } = await obterEquipamentos();
  return (
    <>
      <Cabecalho ativo="arsenal" />
      {exemplo ? <AvisoExemplo /> : null}
      <main id="conteudo" tabIndex={-1}>
        <CatalogoArsenal
          equipamentos={dados}
          categorias={categoriasComItens(dados)}
          categoriaInicial={categoria ?? "todos"}
        >
          <RotuloSecao>Base de dados · Arsenal</RotuloSecao>
          <h1 className="mt-3.5 font-display text-[clamp(48px,8vw,112px)] leading-[0.9] font-extrabold uppercase [overflow-wrap:anywhere]">
            {categoria ? CATEGORIAS[categoria] : "Catálogo de equipamentos"}
          </h1>
        </CatalogoArsenal>
      </main>
      <Rodape nota="Especificações aproximadas, de fontes abertas. Cada ficha lista suas referências." />
    </>
  );
}
