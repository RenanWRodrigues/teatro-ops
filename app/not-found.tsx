import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { TelaErro } from "@/components/TelaErro";

export const metadata: Metadata = { title: "Página não encontrada", robots: { index: false, follow: true } };

export default function NaoEncontrada() {
  return (
    <>
      <Cabecalho />
      <TelaErro
        codigo="Erro 404"
        titulo="Página não encontrada"
        texto={<p>O endereço pode ter mudado ou estar incorreto. Use a busca ou volte à página inicial.</p>}
      />
      <Rodape />
    </>
  );
}
