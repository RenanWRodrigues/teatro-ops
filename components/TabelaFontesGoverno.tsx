import type { FonteGoverno, StatusFonteGoverno } from "@/lib/dados";
import { PAISES_MONITORADOS } from "@/lib/governos/paises";
import { Bandeira } from "./Bandeira";
import { SeloEstatal } from "./SeloEstatal";

const ROTULO_STATUS: Record<StatusFonteGoverno, string> = {
  coletando: "Coleta automática",
  em_verificacao: "Em verificação",
  sem_acesso: "Sem acesso automático",
};

const COR_STATUS: Record<StatusFonteGoverno, string> = {
  coletando: "text-accent",
  em_verificacao: "text-text-2",
  sem_acesso: "text-muted",
};

/** País · órgão · situação da coleta · página oficial. Mostra também os canais que não conseguimos coletar. */
export function TabelaFontesGoverno({ fontes }: { fontes: FonteGoverno[] }) {
  const ordem = new Map<string, number>(PAISES_MONITORADOS.map((p, i) => [p.codigo, i]));
  const linhas = [...fontes].sort((a, b) => (ordem.get(a.pais) ?? 99) - (ordem.get(b.pais) ?? 99) || a.nome.localeCompare(b.nome, "pt-BR"));
  return (
    <div className="border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Canais oficiais monitorados por país e situação da coleta</caption>
        <thead>
          <tr className="border-b border-line font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
            <th scope="col" className="px-2.5 py-3 font-normal sm:px-4">País</th>
            <th scope="col" className="px-2.5 py-3 font-normal sm:px-4">Órgão</th>
            <th scope="col" className="px-2.5 py-3 font-normal sm:px-4">Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((f) => {
            const pais = PAISES_MONITORADOS.find((p) => p.codigo === f.pais);
            return (
              <tr key={f.id} className="border-b border-line-soft last:border-b-0">
                <td className="px-2.5 py-3 align-top sm:px-4">
                  <span className="inline-flex items-center gap-2 text-text-2">
                    <Bandeira pais={f.pais} className="h-3.5 w-[21px]" />
                    {pais?.nome ?? f.pais}
                  </span>
                </td>
                <td className="px-2.5 py-3 align-top sm:px-4">
                  <span className="inline-flex flex-wrap items-center gap-2 [overflow-wrap:anywhere]">
                    {f.pagina ? (
                      <a href={f.pagina} className="text-text underline underline-offset-2 hover:text-accent" rel="noopener noreferrer" target="_blank">
                        {f.nome}
                        <span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      f.nome
                    )}
                    {f.estatal ? <SeloEstatal /> : null}
                  </span>
                </td>
                <td className={`px-2.5 py-3 align-top font-mono text-xs sm:px-4 ${COR_STATUS[f.status]}`}>{ROTULO_STATUS[f.status]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
