// [EXEMPLO] Textos do dossiê copiados da referência visual (Tech.dc.html).
// Antes de publicar, cada afirmação precisa de fonte verificável (skill conteudo-editorial-seguro §4).
import type { EventoLinhaDoTempo, Fonte, TopicoTecnologia } from "@/lib/tipos";

const FONTE_EXEMPLO: Fonte = { nome: "[EXEMPLO] fonte a definir", url: null };

export const TOPICOS_TECNOLOGIA: TopicoTecnologia[] = [
  {
    id: "drones-fpv",
    rotulo: "Drones FPV",
    titulo: "Drones FPV",
    texto:
      "Quadricópteros baratos, pilotados em primeira pessoa com óculos de vídeo, transformaram componentes comerciais em armas de precisão de baixo custo e mudaram a economia do campo de batalha.",
    pontos: [
      { chave: "CUSTO", valor: "Ordens de grandeza mais barato que um míssil guiado." },
      { chave: "ESCALA", valor: "Produção descentralizada, em oficinas e linhas civis." },
      { chave: "LIMITE", valor: "Alcance curto e alta vulnerabilidade a interferência." },
    ],
    fontes: [FONTE_EXEMPLO],
    debate: "O baixo custo amplia o acesso ao poder aéreo, inclusive para grupos não estatais?",
  },
  {
    id: "enxames",
    rotulo: "Enxames",
    titulo: "Enxames",
    texto:
      "Grupos de drones que coordenam o movimento entre si, com pouca intervenção humana, buscam saturar defesas pela quantidade em vez da sofisticação de cada unidade.",
    pontos: [
      { chave: "IDEIA", valor: "Muitos sistemas simples no lugar de poucos sistemas caros." },
      { chave: "TECNOLOGIA", valor: "Algoritmos de coordenação inspirados em bandos de aves." },
      { chave: "ESTÁGIO", valor: "Majoritariamente em testes e demonstrações." },
    ],
    fontes: [FONTE_EXEMPLO],
    debate: "Quem é responsável quando decisões emergem do grupo, não de um operador?",
  },
  {
    id: "ia-alvos",
    rotulo: "IA de alvos",
    titulo: "IA na identificação de alvos",
    texto:
      "Visão computacional ajuda a detectar e classificar veículos e estruturas em imagens de satélite e vídeo, acelerando a análise de inteligência, que antes levava dias.",
    pontos: [
      { chave: "USO", valor: "Triagem de grandes volumes de imagens e sinais." },
      { chave: "GANHO", valor: "Velocidade no ciclo de decisão." },
      { chave: "RISCO", valor: "Erros de classificação e viés nos dados de treino." },
    ],
    fontes: [FONTE_EXEMPLO],
    debate: "A velocidade da IA pode pressionar humanos a apenas referendar recomendações?",
  },
  {
    id: "guerra-eletronica",
    rotulo: "Guerra eletrônica",
    titulo: "Guerra eletrônica",
    texto:
      "Interferência em rádio e GPS tornou-se uma das principais defesas contra drones — e levou ao desenvolvimento de navegação alternativa e maior autonomia de bordo.",
    pontos: [
      { chave: "INTERFERÊNCIA", valor: "Bloqueio do enlace entre piloto e drone." },
      { chave: "FALSIFICAÇÃO DE SINAL", valor: "Sinais falsos de posição." },
      { chave: "RESPOSTA", valor: "Fibra óptica, saltos de frequência e autonomia." },
    ],
    fontes: [FONTE_EXEMPLO],
    debate: "A disputa pelo espectro empurra os sistemas para mais autonomia?",
  },
  {
    id: "defesa-antidrone",
    rotulo: "Defesa antidrone",
    titulo: "Defesa antidrone",
    texto:
      "Radares, sensores acústicos, lasers, interceptores e canhões compõem defesas em camadas — com o desafio de não gastar um míssil caro contra um drone barato.",
    pontos: [
      { chave: "DETECTAR", valor: "Radar, sensores ópticos, acústicos e de radiofrequência." },
      { chave: "NEUTRALIZAR", valor: "Interferência, interceptores e energia dirigida." },
      { chave: "DILEMA", valor: "A equação de custo por abate." },
    ],
    fontes: [FONTE_EXEMPLO],
    debate: "A assimetria de custo favorece, por enquanto, o atacante?",
  },
];

export const LINHA_DRONES: EventoLinhaDoTempo[] = [
  { marco: "1995", descricao: "MQ-1 Predator entra em operação para reconhecimento nos Bálcãs." },
  { marco: "2001", descricao: "Primeiros ataques com drones armados no Afeganistão." },
  { marco: "2020", descricao: "Nagorno-Karabakh: drones e munições de espera são empregados em larga escala." },
  { marco: "2022", descricao: "Ucrânia: drones comerciais e FPV passam a ser usados em massa." },
  { marco: "Hoje", descricao: "Drones navais, enxames e autonomia assistida por IA em teste.", atual: true },
];

export const FONTES_LINHA_DRONES: Fonte[] = [FONTE_EXEMPLO];
export const FONTES_ETICA: Fonte[] = [FONTE_EXEMPLO];

export const NIVEIS_CONTROLE = [
  { sigla: "NO CIRCUITO", texto: "Humano decide cada ação" },
  { sigla: "SOBRE O CIRCUITO", texto: "Máquina age, humano supervisiona" },
  { sigla: "FORA DO CIRCUITO", texto: "Autonomia total", alerta: true },
];
