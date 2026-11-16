// Lista pública de fontes para /fontes (Fase 9, item 3), gerada de config/fontes.yaml.
// Mostra todas as fontes registradas, inclusive as fora do ar ou em verificação (transparência).
import { parse } from "yaml";
import { z } from "zod";
import { paisPorCodigo } from "@/lib/governos/paises";
import { esquemaFonteYaml, SECOES_DE_DADOS, type FonteYaml } from "./registro";

export const ROTULO_SECAO: Record<(typeof SECOES_DE_DADOS)[number], string> = {
  conflitos: "Conflitos, eventos e notícias",
  governos: "Governos",
  arsenal: "Arsenal",
  imprensa_defesa: "Imprensa especializada em defesa",
};

export const ROTULO_STATUS: Record<FonteYaml["status"], string> = {
  ativa: "Coletando",
  a_verificar: "Em verificação",
  quebrada: "Fora do ar",
  desativada: "Desativada",
};

export const ROTULO_CATEGORIA: Record<FonteYaml["categoria"], string> = {
  estatal: "Mídia estatal",
  oficial: "Governo (oficial)",
  imprensa: "Imprensa",
  pesquisa: "Pesquisa",
  humanitaria: "Humanitária",
  enciclopedia: "Enciclopédia colaborativa",
};

export const ROTULO_TIPO: Record<FonteYaml["tipo"], string> = {
  api: "API",
  rss: "Feed RSS/Atom",
  dataset: "Conjunto de dados",
  scrape: "Página web",
};

/** Frequência por job (crons de .github/workflows/ingestao.yml). */
export const ROTULO_FREQUENCIA: Record<string, string> = {
  noticias: "A cada 30 min",
  governos: "A cada hora",
  eventos: "Diária",
  arsenal: "Semanal",
  arquivo: "Anual (manual)",
  manual: "Manual",
};

export type FontePublica = {
  id: string;
  nome: string;
  /** Página para pessoas, quando houver; senão o endereço do serviço. */
  link: string | null;
  tipo: string;
  categoria: string;
  licenca: string;
  status: FonteYaml["status"];
  rotuloStatus: string;
  frequencia: string;
  pais: string | null;
};

export type SecaoFontes = { id: string; titulo: string; fontes: FontePublica[] };

const ORDEM_STATUS: FonteYaml["status"][] = ["ativa", "a_verificar", "quebrada", "desativada"];

/** Seções na ordem do YAML; dentro de cada uma, as que estão coletando primeiro, depois por nome. Placeholders saem. */
export function listarFontesPublicas(textoYaml: string): SecaoFontes[] {
  const bruto = z.record(z.string(), z.array(z.unknown())).parse(parse(textoYaml));
  return SECOES_DE_DADOS.map((secao) => {
    const fontes = (bruto[secao] ?? [])
      .map((item) => esquemaFonteYaml.parse(item))
      .filter((f) => !f.nome.includes("[preencher]"))
      .map(
        (f): FontePublica => ({
          id: f.id,
          nome: f.nome,
          link: f.pagina ?? f.url ?? f.feed ?? null,
          tipo: ROTULO_TIPO[f.tipo],
          categoria: ROTULO_CATEGORIA[f.categoria],
          licenca: f.licenca,
          status: f.status,
          rotuloStatus: ROTULO_STATUS[f.status],
          frequencia: f.job ? (ROTULO_FREQUENCIA[f.job] ?? "—") : "—",
          pais: f.pais ? (paisPorCodigo(f.pais)?.nome ?? f.pais) : null,
        }),
      )
      .sort((a, b) => ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status) || a.nome.localeCompare(b.nome, "pt-BR"));
    return { id: secao, titulo: ROTULO_SECAO[secao], fontes };
  });
}
