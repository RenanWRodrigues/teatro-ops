// [EXEMPLO] Fixtures de desenvolvimento copiadas da referência visual aprovada
// (docs/design/referencia/Arsenal.dc.html e Ficha.dc.html). NÃO são dados verificados:
// na Fase 7 cada valor passa a vir do Wikidata/Wikipedia/Commons com fonte própria.
import type { Unidade } from "@/lib/format";
import type { Categoria, Equipamento, Especificacao, Fonte } from "@/lib/tipos";
import { CATEGORIAS } from "@/lib/tipos";

const FONTE_EXEMPLO: Fonte = { nome: "[EXEMPLO] fonte a verificar", url: null };

const spec = (
  valor: number,
  unidade: Unidade,
  extra: { aproximado?: boolean; sufixo?: string } = {},
): Especificacao => ({ valor, unidade, ...extra, fonte: FONTE_EXEMPLO });

const item = (rotulo: string, valor: string) => ({ rotulo, valor, fonte: FONTE_EXEMPLO });

export const EQUIPAMENTOS_EXEMPLO: Equipamento[] = [
  {
    exemplo: true,
    slug: "f-35a-lightning-ii",
    nome: "F-35A Lightning II",
    categoria: "cacas",
    classe: "Caça · 5ª geração",
    descricao: "Caça furtivo multimissão de 5ª geração",
    paises: ["EUA"],
    fabricante: "Lockheed Martin",
    emServico: true,
    destaque: "Mach 1,6",
    chamadas: ["Mach 1,6", "Motor F135", "Furtivo"],
    resumo: {
      texto:
        "Caça monomotor furtivo projetado para missões ar-ar, ataque ao solo e coleta de inteligência. A versão A, de pouso e decolagem convencionais, é a mais produzida do programa e combina baixa assinatura de radar com fusão de sensores que entrega ao piloto uma imagem integrada do campo de batalha.",
      fonte: FONTE_EXEMPLO,
    },
    estatisticas: [
      { rotulo: "Velocidade máx.", spec: spec(1.6, "mach"), realce: true },
      { rotulo: "Raio de combate", spec: spec(1090, "km", { sufixo: "+" }) },
      { rotulo: "Teto de serviço", spec: spec(15240, "m") },
      { rotulo: "Limite G", spec: spec(9, "g") },
    ],
    ficha: [
      item("Fabricante", "Lockheed Martin"),
      item("Primeiro voo", "2006"),
      item("Tripulação", "1"),
      item("Comprimento", "15,7 m"),
      item("Envergadura", "10,7 m"),
      item("Altura", "4,4 m"),
      item("Motor", "P&W F135"),
      item("Combustível interno", "~8.300 kg"),
      item("Canhão", "GAU-22/A 25 mm"),
      item("Pontos de carga", "4 internos · 6 externos"),
    ],
    planta: { comprimento: spec(15.7, "m"), envergadura: spec(10.7, "m") },
    variantes: [
      { nome: "F-35A", descricao: "Pouso e decolagem convencionais. Canhão interno de 25 mm.", atual: true },
      { nome: "F-35B", descricao: "Decolagem curta e pouso vertical (STOVL), para navios de assalto." },
      { nome: "F-35C", descricao: "Versão embarcada para porta-aviões, com asa maior e dobrável." },
    ],
    galeria: [
      { legenda: "Cabine", url: null },
      { legenda: "Compartimento de armas", url: null },
      { legenda: "Reabastecimento", url: null },
      { legenda: "Decolagem", url: null },
    ],
    operadores: ["EUA", "Reino Unido", "Israel", "Japão", "Austrália", "Noruega"],
    fontes: [
      { nome: "[EXEMPLO] Lockheed Martin", url: null },
      { nome: "[EXEMPLO] Força Aérea dos EUA — ficha informativa", url: null },
      { nome: "[EXEMPLO] Relatórios do GAO (órgão de auditoria do Congresso dos EUA)", url: null },
    ],
  },
  base("su-57", "Su-57", "cacas", "Caça de superioridade aérea de 5ª geração", ["Rússia"], "~Mach 2"),
  base("rafale", "Rafale", "cacas", "Caça bimotor multimissão, versões naval e terrestre", ["França"], "Mach 1,8"),
  base("gripen-e-f-39", "Gripen E / F-39", "cacas", "Caça monomotor operado pela Força Aérea Brasileira (FAB)", ["Suécia", "Brasil"], "Mach 2"),
  base("leopard-2a7", "Leopard 2A7", "tanques", "Carro de combate principal", ["Alemanha"], "Canhão 120 mm"),
  base("m1a2-abrams", "M1A2 Abrams", "tanques", "Carro de combate principal com turbina a gás", ["EUA"], "Canhão 120 mm"),
  base("t-90m", "T-90M", "tanques", "Carro de combate com carregador automático", ["Rússia"], "Canhão 125 mm"),
  base("uss-gerald-r-ford", "USS Gerald R. Ford", "embarcacoes", "Porta-aviões de propulsão nuclear, classe Ford", ["EUA"], "~100.000 t"),
  base("type-055", "Type 055", "embarcacoes", "Destróier de mísseis guiados", ["China"], "112 células de lançamento"),
  base("classe-riachuelo", "Classe Riachuelo", "embarcacoes", "Submarino convencional (Scorpène)", ["Brasil", "França"], "Programa de Submarinos (Prosub)"),
  base("b-21-raider", "B-21 Raider", "avioes", "Bombardeiro estratégico furtivo", ["EUA"], "Asa voadora"),
  base("kc-390-millennium", "KC-390 Millennium", "avioes", "Transporte militar e reabastecimento em voo", ["Brasil"], "Carga 26 t"),
  base("m142-himars", "M142 HIMARS", "armamento", "Lançador múltiplo de foguetes sobre rodas", ["EUA"], "GMLRS"),
  base("bayraktar-tb2", "Bayraktar TB2", "drones", "Drone tático de média altitude e longa autonomia (MALE)", ["Turquia"], "Armado"),
  base("mq-9-reaper", "MQ-9 Reaper", "drones", "Drone de longa autonomia, vigilância e ataque", ["EUA"], "MALE"),
];

function base(
  slug: string,
  nome: string,
  categoria: Categoria,
  descricao: string,
  paises: string[],
  destaque: string,
): Equipamento {
  return { exemplo: true, slug, nome, categoria, descricao, paises, destaque, fontes: [FONTE_EXEMPLO] };
}

export function buscarEquipamento(categoria: string, slug: string): Equipamento | undefined {
  return EQUIPAMENTOS_EXEMPLO.find((e) => e.categoria === categoria && e.slug === slug);
}

/** Categorias que têm pelo menos um equipamento, na ordem canônica. */
export function categoriasComItens(lista: Equipamento[] = EQUIPAMENTOS_EXEMPLO): Categoria[] {
  return (Object.keys(CATEGORIAS) as Categoria[]).filter((c) => lista.some((e) => e.categoria === c));
}

