// Mostra a FORMA das variáveis do Supabase (existe? tipo de chave? tamanho?), nunca o valor.
// Uso: pnpm env:verificar   (lê o .env.local)
import { existsSync, readFileSync } from "node:fs";

const NOMES = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DEEPL_API_KEY"] as const;

function forma(v: string | undefined): string {
  if (v === undefined) return "não definida";
  if (v === "") return "vazia";
  const tipo = v.startsWith("http")
    ? "URL"
    : v.startsWith("sb_publishable_")
      ? "sb_publishable_…"
      : v.startsWith("sb_secret_")
        ? "sb_secret_…"
        : v.startsWith("eyJ")
          ? "JWT legado (eyJ…)"
          : /^[0-9a-f-]{36}:fx$/i.test(v)
            ? "chave DeepL Free (…:fx)"
            : /^[0-9a-f-]{36}$/i.test(v)
              ? "⚠ chave DeepL Pro (sem :fx) — o projeto usa o endereço Free"
              : "formato inesperado";
  const alerta = /\s|^["']|["']$|#/.test(v) ? "  ⚠ contém espaço, aspas ou #" : "";
  return `${tipo}, ${v.length} caracteres${alerta}`;
}

for (const nome of NOMES) console.log(nome.padEnd(31), forma(process.env[nome]));

// Diagnóstico do arquivo: tamanho, codificação e NOMES das variáveis (nunca os valores).

const ARQUIVO = ".env.local";
if (!existsSync(ARQUIVO)) {
  console.log(`\n${ARQUIVO}: não encontrado na pasta do projeto.`);
} else {
  const bytes = readFileSync(ARQUIVO);
  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff) || bytes.includes(0);
  const bomUtf8 = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  console.log(`\n${ARQUIVO}: ${bytes.length} bytes`);
  if (bytes.length === 0) console.log("  ⚠ arquivo vazio");
  if (utf16) console.log("  ⚠ salvo em UTF-16 — salve de novo como UTF-8 (o leitor de .env ignora UTF-16)");
  if (bomUtf8) console.log("  ⚠ começa com BOM (UTF-8 com assinatura) — a 1ª variável pode não ser lida");
  if (!utf16) {
    const linhas = bytes.toString("utf8").replace(/^﻿/, "").split(/\r?\n/);
    const nomes = linhas.flatMap((l) => {
      const m = /^\s*(#\s*)?(export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(l);
      return m ? [`${m[3]}${m[1] ? " (comentada)" : ""}`] : [];
    });
    console.log(`  variáveis encontradas (${nomes.length}):`, nomes.length ? nomes.join(", ") : "nenhuma");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url?.startsWith("http")) console.log("host da URL:".padEnd(31), new URL(url).host);
