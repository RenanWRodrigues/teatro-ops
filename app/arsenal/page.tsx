import type { Metadata } from "next";
import { PaginaArsenal } from "@/components/PaginaArsenal";

export const metadata: Metadata = {
  title: "Arsenal — catálogo de equipamentos",
  description: "Fichas técnicas de caças, tanques, embarcações, aviões, armamento e drones, com fonte em cada especificação.",
};

export default function Page() {
  return <PaginaArsenal />;
}
