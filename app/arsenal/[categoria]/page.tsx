import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import { notFound } from "next/navigation";
import { PaginaArsenal } from "@/components/PaginaArsenal";
import { CATEGORIAS, ehCategoria } from "@/lib/tipos";

export function generateStaticParams() {
  return Object.keys(CATEGORIAS).map((categoria) => ({ categoria }));
}

export async function generateMetadata({ params }: PageProps<"/arsenal/[categoria]">): Promise<Metadata> {
  const { categoria } = await params;
  if (!ehCategoria(categoria)) return {};
  return metadados({
    titulo: `${CATEGORIAS[categoria]} — arsenal`,
    descricao: `Fichas técnicas de ${CATEGORIAS[categoria].toLowerCase()}, com fonte em cada especificação e fotos de licença livre.`,
    caminho: `/arsenal/${categoria}`,
  });
}

// `params` é aguardado fora de <Suspense> para que categorias inexistentes devolvam 404 real (ver next.config.ts).
export default async function Page({ params }: PageProps<"/arsenal/[categoria]">) {
  const { categoria } = await params;
  if (!ehCategoria(categoria)) notFound();
  return <PaginaArsenal categoria={categoria} />;
}
