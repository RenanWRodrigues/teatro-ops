"use client";

import { useEffect, useState } from "react";
import { formatarDiaHora } from "@/lib/format";

type Props = {
  /** ISO 8601 da última coleta sem erro. */
  data: string;
  /** Acima de quantas horas sem coleta a fonte é considerada indisponível. */
  limiteHoras: number;
};

/**
 * Aviso de dado defasado, calculado no navegador: a página pode estar em cache, mas o "agora" é sempre o
 * de quem lê. Sem JavaScript, o carimbo "Atualizado em …" continua visível ao lado.
 */
export function AvisoDefasagem({ data, limiteHoras }: Props) {
  const [defasado, setDefasado] = useState(false);
  useEffect(() => {
    const verificar = () => setDefasado(Date.now() - Date.parse(data) > limiteHoras * 3_600_000);
    verificar();
    const id = setInterval(verificar, 60_000);
    return () => clearInterval(id);
  }, [data, limiteHoras]);
  if (!defasado) return null;
  return (
    <span role="status" className="mt-1 block font-mono text-xs tracking-[0.06em] text-alert-text">
      Fonte temporariamente indisponível — exibindo dados de {formatarDiaHora(data)}
    </span>
  );
}
