// Leitor de CSV (RFC 4180): campos entre aspas, "" como aspas escapadas, quebras de linha dentro do campo.

export function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let entreAspas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (entreAspas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') entreAspas = false;
      else campo += c;
    } else if (c === '"') entreAspas = true;
    else if (c === ",") {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
  return linhas;
}


/** CSV com cabeçalho → objetos { coluna: valor }. */
export function lerCsvComCabecalho(texto: string): Record<string, string>[] {
  const [cabecalho, ...linhas] = lerCsv(texto);
  if (!cabecalho) return [];
  return linhas.map((l) => Object.fromEntries(cabecalho.map((c, i) => [c, l[i] ?? ""])));
}
