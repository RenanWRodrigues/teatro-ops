// Converte as consultas do GDELT em config/fontes.yaml num filtro aplicado ao título.
// Sintaxe suportada (a usada no YAML): grupos entre parênteses unidos por E; termos dentro do grupo
// unidos por OR; "frases entre aspas". Ex.: ("artificial intelligence" OR "AI") (military OR defense)

export type Consulta = { grupos: RegExp[][] };

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function regexTermo(termo: string): RegExp {
  // Siglas curtas em maiúsculas ("AI", "UAV") diferenciam maiúsculas; o resto não.
  const sigla = /^[A-Z0-9]{2,4}$/.test(termo);
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapar(termo)}(?![\\p{L}\\p{N}])`, sigla ? "u" : "iu");
}

export function compilarConsulta(texto: string): Consulta {
  const grupos = [...texto.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]!);
  const brutos = grupos.length > 0 ? grupos : [texto];
  return {
    grupos: brutos.map((g) =>
      g
        .split(/\s+OR\s+/)
        .map((t) => t.trim().replace(/^"|"$/g, ""))
        .filter(Boolean)
        .map(regexTermo),
    ),
  };
}

export const casa = (consulta: Consulta, titulo: string) => consulta.grupos.every((termos) => termos.some((re) => re.test(titulo)));
