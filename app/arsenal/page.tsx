import type { Metadata } from "next";
import { metadados } from "@/lib/site";
import { PaginaArsenal } from "@/components/PaginaArsenal";

export const metadata: Metadata = metadados({
  titulo: "Arsenal — catálogo de equipamentos",
  descricao: "Fichas técnicas de caças, tanques, embarcações, aviões, armamento e drones, com fonte em cada especificação.",
  caminho: "/arsenal",
});

export default function Page() {
  return <PaginaArsenal />;
}
