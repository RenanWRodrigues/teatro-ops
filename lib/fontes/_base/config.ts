// Lê config/fontes.yaml do disco (só em scripts de ingestão/Node).
import { readFileSync } from "node:fs";
import path from "node:path";
import { lerEntradasFontes, type FonteYaml } from "../registro";

let cache: Map<string, FonteYaml> | undefined;

export function configFontes(): Map<string, FonteYaml> {
  cache ??= lerEntradasFontes(readFileSync(path.join(process.cwd(), "config/fontes.yaml"), "utf8"));
  return cache;
}

export function configFonte(id: string): FonteYaml {
  const f = configFontes().get(id);
  if (!f) throw new Error(`Fonte "${id}" não está em config/fontes.yaml`);
  return f;
}
