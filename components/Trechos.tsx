import type { Trecho } from "@/lib/tecnologia/dossie";
import { RefFonte } from "./RefFonte";

/** Texto editorial com **negrito**, *itálico* e chamadas [n] já separados por lerTrechos. */
export function Trechos({ trechos, prefixo }: { trechos: Trecho[]; prefixo: string }) {
  return trechos.map((t, i) => {
    if (t.tipo === "negrito")
      return (
        <strong key={i} className="font-semibold text-text">
          {t.texto}
        </strong>
      );
    if (t.tipo === "italico") return <em key={i}>{t.texto}</em>;
    if (t.tipo === "ref") return <RefFonte key={i} numero={t.n} prefixo={prefixo} className="ml-0.5" />;
    return t.texto;
  });
}
