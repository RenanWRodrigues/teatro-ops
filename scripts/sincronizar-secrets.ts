// Envia ao GitHub Actions as variáveis PREENCHIDAS do .env.local (nomes do .env.example).
// Uso: pnpm secrets:sincronizar
// O .env.local é lido pelo próprio Node (--env-file), que ignora comentários; os valores vão
// para o `gh` pela entrada padrão e nunca aparecem na tela nem na linha de comando.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const nomes = readFileSync(".env.example", "utf8")
  .split(/\r?\n/)
  .flatMap((l) => /^([A-Z][A-Z0-9_]*)=/.exec(l)?.[1] ?? []);

// Valores públicos que o workflow lê como `vars.*` (não `secrets.*`): vão com `gh variable set`.
const VARIAVEIS = new Set(["WIKIMEDIA_USER_AGENT"]);

let enviados = 0;
for (const nome of nomes) {
  const valor = process.env[nome]?.trim();
  if (!valor) {
    console.log(`  ${nome.padEnd(31)} vazia — não enviada`);
    continue;
  }
  if (valor.startsWith("#")) {
    console.log(`  ${nome.padEnd(31)} ⚠ parece um comentário — não enviada`);
    continue;
  }
  const tipo = VARIAVEIS.has(nome) ? "variable" : "secret";
  // Sem shell: o gh é um executável, e com shell o Node só concatena os argumentos (DEP0190).
  const r = spawnSync("gh", [tipo, "set", nome], { input: valor, encoding: "utf8" });
  if (r.status === 0) {
    enviados++;
    console.log(`  ${nome.padEnd(31)} enviada (${tipo === "variable" ? "variável" : "secret"})`);
  } else {
    console.log(`  ${nome.padEnd(31)} ERRO: ${(r.stderr || "").trim().split("\n")[0]}`);
  }
}
console.log(`\n${enviados} valor(es) enviados ao repositório do remoto "origin".`);
