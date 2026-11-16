// Filtro de relevância do monitor de governos (skill monitor-governos).
// Um comunicado entra em `decisoes_governo` se o título ou a descrição tiver termos de ao menos um grupo.
// Termos em inglês (a maioria dos feeds oficiais tem versão em inglês) e nos idiomas originais
// (russo, ucraniano, chinês, persa, hebraico, alemão). Latinos casam por palavra; os demais por trecho.

export const GRUPOS = [
  "defesa",
  "sancoes",
  "conflito",
  "armas",
  "ia_militar",
  "orcamento_defesa",
  "exercicio_militar",
  "acordo",
] as const;
export type Grupo = (typeof GRUPOS)[number];

export const ROTULO_GRUPO: Record<Grupo, string> = {
  defesa: "defesa",
  sancoes: "sanções",
  conflito: "conflito e negociação",
  armas: "armamentos",
  ia_militar: "IA militar",
  orcamento_defesa: "orçamento de defesa",
  exercicio_militar: "exercício militar",
  acordo: "acordos e tratados",
};

type Termos = { latinos: string[]; outros: string[] };

export const TERMOS: Record<Grupo, Termos> = {
  defesa: {
    latinos: [
      "defense", "defence", "military", "armed forces", "army", "navy", "air force", "marines", "troops", "soldiers",
      "general staff", "chief of staff of the armed forces", "national security", "security council", "pentagon", "special operations",
      "Streitkräfte", "Militär", "Soldaten", "Sicherheitsrat",
    ],
    outros: ["verteidigung", "bundeswehr", "оборон", "вооружённ", "вооруженн", "армі", "збройн", "військ", "国防", "军队", "解放军", "دفاع", "ارتش", "سپاه", "ביטחון", "צה\"ל", "צבא"],
  },
  sancoes: {
    latinos: [
      "sanction", "sanctions", "sanctioned", "sanctioning", "OFAC", "embargo", "export control", "export controls", "entity list",
      "designation", "designated", "blocking property", "asset freeze", "terrorist organization", "national emergency with respect to",
      "Sanktion", "Sanktionen", "Exportkontrolle",
    ],
    outros: ["sanktion", "санкци", "санкці", "制裁", "تحریم", "סנקצי"],
  },
  conflito: {
    latinos: [
      "war", "ceasefire", "cease-fire", "truce", "armistice", "hostilities", "offensive", "invasion", "airstrike", "air strike",
      "missile attack", "shelling", "hostage", "hostages", "peace talks", "peace negotiations", "negotiations", "peace plan",
      "front line", "frontline", "occupation", "aggression", "attack", "attacks", "strikes", "terrorist attack", "counterterrorism",
      "insurgency", "coalition of the willing", "Koalition der Willigen",
      "Krieg", "Waffenstillstand", "Friedensverhandlungen", "Angriff",
    ],
    outros: ["войн", "перемири", "переговор", "агресі", "війн", "перемир", "战争", "停火", "冲突", "جنگ", "آتش‌بس", "مذاکر", "מלחמה", "הפסקת אש", "חטופים"],
  },
  armas: {
    latinos: [
      "weapon", "weapons", "missile", "missiles", "nuclear", "warhead", "drone", "drones", "UAV", "ammunition", "munitions",
      "artillery", "air defense", "air defence", "tank", "tanks", "fighter jet", "fighter jets", "arms sale", "arms sales",
      "arms control", "nonproliferation", "non-proliferation", "proliferation", "enrichment", "uranium", "hypersonic",
      "Waffen", "Rakete", "Raketen", "Drohne", "Drohnen", "Munition", "atomar",
    ],
    outros: ["rüstung", "luftverteidigung", "ракет", "ядерн", "дрон", "беспилот", "безпілот", "зброї", "озброєн", "导弹", "核武", "核问题", "无人机", "武器", "موشک", "هسته", "پهپاد", "טיל", "גרעינ", "כטב\"ם"],
  },
  ia_militar: {
    latinos: ["artificial intelligence", "autonomous weapon", "autonomous weapons", "military AI", "AI-enabled", "künstliche Intelligenz"],
    outros: ["искусственн интеллект", "искусственного интеллекта", "штучного інтелекту", "人工智能", "هوش مصنوعی", "בינה מלאכותית"],
  },
  orcamento_defesa: {
    latinos: [
      "defense budget", "defence budget", "military spending", "defense spending", "defence spending", "National Defense Authorization Act",
      "NDAA", "military aid", "security assistance", "Sondervermögen",
    ],
    outros: ["verteidigungshaushalt", "verteidigungsetat", "военный бюджет", "оборонный бюджет", "国防预算", "بودجه دفاعی"],
  },
  exercicio_militar: {
    latinos: ["military exercise", "military exercises", "military drill", "military drills", "joint exercise", "joint exercises", "war games", "naval drills", "Manöver", "Militärübung"],
    outros: ["военные учения", "военных учений", "військові навчання", "军演", "演习", "رزمایش", "תרגיל"],
  },
  acordo: {
    latinos: [
      "treaty", "agreement", "accord", "memorandum of understanding", "security guarantees", "strategic partnership", "alliance", "NATO",
      // "Vertrag" fica de fora: em alemão é também "contrato" e aparece em qualquer texto da UE ("EU-Vertrag").
      "Abkommen", "Bündnis", "Rüstungskontrollvertrag", "Atomwaffensperrvertrag",
    ],
    outros: ["договор", "соглашени", "угод", "条约", "协定", "توافق", "معاهده", "הסכם"],
  },
};

/**
 * Nomes dos próprios órgãos não contam como termo: "Department of War" ou "Secretary of Defense" casariam
 * "war"/"defense" em todo comunicado do ministério, inclusive os administrativos (creche, bolsas, obras).
 * O comunicado entra só se o assunto em si tiver um termo.
 */
const NOMES_DE_ORGAO =
  /(?<![\p{L}])(?:(?:(?:Deputy|Assistant|Under) )?Secretary of (?:War|Defen[cs]e)|Department of (?:War|Defen[cs]e)|War Department|Defen[cs]e Department|Ministry of Defen[cs]e|Defen[cs]e Ministry|Army Corps of Engineers|DoW|DoD|Bundesministerium der Verteidigung|Verteidigungsministerium|Verteidigungsminister(?:in)?)(?![\p{L}])/giu;

export const semNomeDeOrgao = (texto: string) => texto.replace(NOMES_DE_ORGAO, " ");

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Termos latinos casam por palavra inteira, sem diferenciar maiúsculas. */
const REGEX: Record<Grupo, RegExp | null> = Object.fromEntries(
  GRUPOS.map((g) => {
    const t = TERMOS[g].latinos;
    return [g, t.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${t.map(escapar).join("|")})(?![\\p{L}\\p{N}])`, "iu") : null];
  }),
) as Record<Grupo, RegExp | null>;

/** Grupos de relevância encontrados no texto (vazio = descartar). */
export function gruposRelevantes(...textos: (string | null | undefined)[]): Grupo[] {
  const texto = semNomeDeOrgao(textos.filter(Boolean).join(" \n "));
  if (!texto) return [];
  const minusculo = texto.toLowerCase();
  return GRUPOS.filter((g) => REGEX[g]?.test(texto) || TERMOS[g].outros.some((t) => minusculo.includes(t.toLowerCase())));
}

/** Atalho: o item é relevante para o monitor? */
export const ehRelevante = (...textos: (string | null | undefined)[]) => gruposRelevantes(...textos).length > 0;

/**
 * Federal Register: avisos administrativos de rotina dos órgãos de defesa (coleta de informações, comitês,
 * estudos ambientais, certificados técnicos). Têm "Defense"/"Military" no título, mas não são decisões.
 */
export const ADMINISTRATIVO_REGISTRO =
  /information collection|comment request|advisory committee|performance review board|environmental impact statement|alternate compliance|privacy act|charter renewal|sunshine act|paperwork reduction|meeting notice|notice of meeting/i;

/**
 * Relevância de um documento do Federal Register que não é presidencial: além de não ser administrativo,
 * precisa de um tema além de "defesa" (o órgão é de defesa, então "defesa" sozinho não diz nada).
 */
export function relevanteNoRegistro(titulo: string, grupos: Grupo[]): boolean {
  return !ADMINISTRATIVO_REGISTRO.test(titulo) && grupos.some((g) => g !== "defesa");
}
