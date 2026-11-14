// Classificação de temas, países e região por regras (sem IA), a partir do título.
// Aplicada ao título original e, depois da tradução, ao título em pt-BR.

export const REGIOES = {
  EO: "Europa Oriental",
  EU: "Europa",
  OM: "Oriente Médio",
  NA: "Norte da África",
  AS: "África Subsaariana",
  IP: "Indo-Pacífico",
  AC: "Ásia Central e do Sul",
  AM: "Américas",
} as const;

type CodigoRegiao = keyof typeof REGIOES;

// [ISO 3166-1 alfa-2, região, termos EN/PT (nomes, gentílicos, capitais)].
// Fora de propósito: "Georgia" (estado dos EUA), "Chad" e "Jordan" (nomes próprios) — só pela capital.
const PAISES: [string, CodigoRegiao, string[]][] = [
  ["UA", "EO", ["Ukraine", "Ukrainian", "Ukrainians", "Kyiv", "Kiev", "Ucrânia", "ucraniano", "ucraniana", "ucranianos", "Kiev"]],
  ["RU", "EO", ["Russia", "Russian", "Russians", "Kremlin", "Moscow", "Rússia", "russo", "russa", "russos", "Moscou"]],
  ["BY", "EO", ["Belarus", "Belarusian", "Minsk", "Belarus", "bielorrusso"]],
  ["MD", "EO", ["Moldova", "Moldovan", "Moldávia"]],
  ["GE", "EO", ["Tbilisi", "Tbilissi"]],
  ["AM", "EO", ["Armenia", "Armenian", "Armênia", "armênio"]],
  ["AZ", "EO", ["Azerbaijan", "Azerbaijani", "Azerbaijão"]],
  ["PL", "EU", ["Poland", "Polish", "Warsaw", "Polônia", "polonês", "Varsóvia"]],
  ["DE", "EU", ["Germany", "German", "Berlin", "Alemanha", "alemão", "alemã", "Berlim"]],
  ["FR", "EU", ["France", "French", "Paris", "França", "francês", "francesa"]],
  ["GB", "EU", ["Britain", "British", "United Kingdom", "UK", "London", "Reino Unido", "britânico", "Londres"]],
  ["IL", "OM", ["Israel", "Israeli", "Israelis", "israelense", "israelenses", "Tel Aviv", "Jerusalem", "Jerusalém"]],
  ["PS", "OM", ["Gaza", "Palestinian", "Palestinians", "West Bank", "Hamas", "palestino", "palestinos", "Cisjordânia"]],
  ["LB", "OM", ["Lebanon", "Lebanese", "Hezbollah", "Beirut", "Líbano", "libanês", "Hezbolá", "Beirute"]],
  ["SY", "OM", ["Syria", "Syrian", "Damascus", "Síria", "sírio", "Damasco"]],
  ["IQ", "OM", ["Iraq", "Iraqi", "Baghdad", "Iraque", "iraquiano", "Bagdá"]],
  ["IR", "OM", ["Iran", "Iranian", "Tehran", "Irã", "iraniano", "iraniana", "Teerã"]],
  ["YE", "OM", ["Yemen", "Yemeni", "Houthi", "Houthis", "Iêmen", "iemenita", "houthis"]],
  ["SA", "OM", ["Saudi", "Riyadh", "Arábia Saudita", "saudita"]],
  ["JO", "OM", ["Amman", "Jordânia"]],
  ["TR", "OM", ["Turkey", "Türkiye", "Turkish", "Ankara", "Turquia", "turco"]],
  ["EG", "NA", ["Egypt", "Egyptian", "Cairo", "Egito", "egípcio"]],
  ["LY", "NA", ["Libya", "Libyan", "Tripoli", "Líbia", "líbio"]],
  ["SD", "AS", ["Sudan", "Sudanese", "Khartoum", "Darfur", "El Fasher", "Nyala", "RSF", "Sudão", "sudanês", "Cartum"]],
  ["SS", "AS", ["South Sudan", "Sudão do Sul"]],
  ["ET", "AS", ["Ethiopia", "Ethiopian", "Tigray", "Etiópia", "etíope"]],
  ["SO", "AS", ["Somalia", "Somali", "al-Shabaab", "Mogadishu", "Somália", "somali"]],
  ["CD", "AS", ["Congo", "Congolese", "DRC", "Kinshasa", "Goma", "congolês"]],
  ["ML", "AS", ["Mali", "Malian", "Bamako", "malinês"]],
  ["BF", "AS", ["Burkina Faso", "Burkinabe"]],
  ["NE", "AS", ["Niger", "Nigerien", "Niamey", "Níger"]],
  ["NG", "AS", ["Nigeria", "Nigerian", "Nigéria", "nigeriano"]],
  ["TD", "AS", ["N'Djamena"]],
  ["MZ", "AS", ["Mozambique", "Cabo Delgado", "Moçambique"]],
  ["CN", "IP", ["China", "Chinese", "Beijing", "PLA", "chinês", "chinesa", "Pequim"]],
  ["TW", "IP", ["Taiwan", "Taiwanese", "Taipei", "Taiwan", "taiwanês"]],
  ["KP", "IP", ["North Korea", "North Korean", "Pyongyang", "Coreia do Norte", "norte-coreano"]],
  ["KR", "IP", ["South Korea", "South Korean", "Seoul", "Coreia do Sul", "sul-coreano"]],
  ["JP", "IP", ["Japan", "Japanese", "Tokyo", "Japão", "japonês", "Tóquio"]],
  ["PH", "IP", ["Philippines", "Philippine", "Filipino", "Manila", "Filipinas", "filipino"]],
  ["MM", "IP", ["Myanmar", "Burma", "Burmese", "Mianmar"]],
  ["IN", "AC", ["India", "Indian", "New Delhi", "Índia", "indiano"]],
  ["PK", "AC", ["Pakistan", "Pakistani", "Pak", "Islamabad", "Balochistan", "Khyber Pakhtunkhwa", "Paquistão", "paquistanês", "Baluchistão"]],
  ["AF", "AC", ["Afghanistan", "Afghan", "Taliban", "Kabul", "Afeganistão", "afegão", "Talibã", "Cabul"]],
  ["US", "AM", ["United States", "U.S.", "US", "American", "Pentagon", "Washington", "Estados Unidos", "EUA", "americano", "Pentágono"]],
  ["VE", "AM", ["Venezuela", "Venezuelan", "Caracas", "venezuelano"]],
  ["CO", "AM", ["Colombia", "Colombian", "Colômbia", "colombiano"]],
  ["HT", "AM", ["Haiti", "Haitian", "haitiano"]],
  ["MX", "AM", ["Mexico", "Mexican", "México", "mexicano"]],
  ["BR", "AM", ["Brazil", "Brazilian", "Brasil", "brasileiro"]],
];

// [tema, termos]. "conflitos" vem da consulta; estes complementam pelo título.
const TEMAS: [string, string[]][] = [
  ["drones", ["drone", "drones", "UAV", "loitering munition", "munição de espera", "Shahed", "FPV", "quadcopter"]],
  ["ia", ["artificial intelligence", "AI", "machine learning", "algorithm", "inteligência artificial", "IA", "algoritmo"]],
  ["guerra-eletronica", ["electronic warfare", "jamming", "jammer", "spoofing", "GPS interference", "guerra eletrônica", "interferência"]],
  ["naval", ["navy", "naval", "warship", "frigate", "destroyer", "submarine", "aircraft carrier", "Black Sea Fleet", "marinha", "fragata", "submarino", "porta-aviões", "destróier"]],
  ["aereo", ["air force", "airstrike", "air strike", "fighter jet", "warplane", "bomber", "força aérea", "ataque aéreo", "caça", "bombardeiro"]],
  ["terrestre", ["tank", "tanks", "artillery", "infantry", "ground offensive", "shelling", "tanque", "artilharia", "infantaria", "ofensiva terrestre"]],
  ["nuclear", ["nuclear", "warhead", "uranium", "enrichment", "ogiva", "urânio"]],
  ["diplomacia", ["ceasefire", "truce", "peace talks", "negotiations", "summit", "sanctions", "diplomat", "cessar-fogo", "trégua", "negociações", "cúpula", "sanções", "diplomata"]],
];

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Termo como palavra inteira; siglas (≤3 letras maiúsculas) diferenciam maiúsculas, o resto não. */
function regexTermo(termo: string): RegExp {
  const sigla = /^[A-Z.]{2,4}$/.test(termo);
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapar(termo)}(?![\\p{L}\\p{N}])`, sigla ? "u" : "iu");
}

const REGRAS_PAISES = PAISES.map(([iso, regiao, termos]) => ({ iso, regiao, res: termos.map(regexTermo) }));
const REGRAS_TEMAS = TEMAS.map(([tema, termos]) => ({ tema, res: termos.map(regexTermo) }));

export type Classificacao = { paises: string[]; temas: string[]; regiao: string | null };

/** Países na ordem em que aparecem no texto; região do primeiro país citado. */
export function classificar(texto: string, temasBase: string[] = []): Classificacao {
  const achados = REGRAS_PAISES.flatMap(({ iso, regiao, res }) => {
    const posicoes = res.map((re) => texto.search(re)).filter((p) => p >= 0);
    return posicoes.length ? [{ iso, regiao, pos: Math.min(...posicoes) }] : [];
  }).sort((a, b) => a.pos - b.pos);

  const temas = new Set(temasBase);
  for (const { tema, res } of REGRAS_TEMAS) if (res.some((re) => re.test(texto))) temas.add(tema);

  const primeiro = achados[0];
  return {
    paises: achados.map((a) => a.iso),
    temas: [...temas].sort(),
    regiao: primeiro ? REGIOES[primeiro.regiao] : null,
  };
}

/** Junta duas classificações (título original + tradução) sem repetir. */
export function unirClassificacoes(a: Classificacao, b: Classificacao): Classificacao {
  const paises = [...new Set([...a.paises, ...b.paises])];
  return { paises, temas: [...new Set([...a.temas, ...b.temas])].sort(), regiao: a.regiao ?? b.regiao };
}
