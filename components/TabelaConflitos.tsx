import Link from "next/link";
import { formatarData, formatarNumero } from "@/lib/format";
import type { ConflitoDetalhe } from "@/lib/tipos";
import { SeloIntensidade } from "./SeloIntensidade";

const n = (v: number) => formatarNumero(v, { casas: 0 });

/** Alternativa em tabela ao mapa: todos os conflitos curados com os números que justificam a intensidade. */
export function TabelaConflitos({ conflitos }: { conflitos: ConflitoDetalhe[] }) {
  const periodo = conflitos.find((c) => c.periodoInicio && c.periodoFim);
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="px-4 py-3 text-left font-mono text-xs text-muted">
          {periodo
            ? `Mortes estimadas pelo UCDP entre ${formatarData(periodo.periodoInicio!)} e ${formatarData(periodo.periodoFim!)} (estimativas preliminares; entre colchetes, o intervalo do mínimo ao máximo).`
            : "Números ainda não coletados do UCDP."}
        </caption>
        <thead className="border-y border-line bg-surface text-left font-mono text-xs tracking-[0.08em] text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Conflito</th>
            <th scope="col" className="px-4 py-3">Situação</th>
            <th scope="col" className="px-4 py-3">Região</th>
            <th scope="col" className="px-4 py-3 text-right">Eventos</th>
            <th scope="col" className="px-4 py-3 text-right">Mortes estimadas</th>
          </tr>
        </thead>
        <tbody>
          {conflitos.map((c) => (
            <tr key={c.slug} className="border-t border-line-soft">
              <th scope="row" className="px-4 py-3 text-left font-semibold">
                <Link href={`/conflitos/${c.slug}`} className="inline-flex min-h-11 items-center text-text hover:text-accent">
                  {c.nome}
                </Link>
              </th>
              <td className="px-4 py-3">
                {c.intensidade ? (
                  <SeloIntensidade intensidade={c.intensidade} />
                ) : (
                  <span className="font-mono text-[11px] text-muted uppercase">{c.semDados ? "Ainda sem dados" : "Abaixo do limiar"}</span>
                )}
              </td>
              <td className="px-4 py-3 text-text-2">{c.regiao}</td>
              <td className="px-4 py-3 text-right font-mono">{c.semDados ? "—" : n(c.eventos)}</td>
              <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                {c.semDados ? "—" : (
                  <>
                    {n(c.mortes)} <span className="text-muted">[{n(c.mortesMin)}–{n(c.mortesMax)}]</span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
