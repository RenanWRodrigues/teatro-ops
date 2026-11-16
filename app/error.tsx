"use client";

import { useEffect } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { TelaErro } from "@/components/TelaErro";

/** Erro inesperado numa página: explica em pt-BR e permite tentar de novo, sem expor detalhes técnicos. */
export default function Erro({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[erro de página]", error);
  }, [error]);
  const codigo = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return (
    <>
      <Cabecalho />
      <TelaErro
        codigo="Erro"
        titulo="Algo deu errado"
        texto={
          <>
            <p>
              Não foi possível montar esta página agora. Uma fonte de dados pode estar temporariamente indisponível. Tente de
              novo em alguns instantes.
            </p>
            {codigo ? <p className="mt-3 font-mono text-xs text-muted">Código para relatar o problema: {codigo}</p> : null}
          </>
        }
        acao={
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-12 items-center border border-accent bg-accent px-6 font-mono text-sm tracking-[0.1em] text-bg uppercase hover:bg-accent-hover"
          >
            Tentar de novo
          </button>
        }
      />
      <Rodape />
    </>
  );
}
