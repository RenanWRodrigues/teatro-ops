import { describe, expect, it } from "vitest";
import { COL } from "@/lib/fontes/gdelt-gkg";
import { normalizarLinhaXinhua } from ".";

const fonte = { id: "xinhua", nome: "Xinhua (mídia estatal)", orgao: "Xinhua", pais: "CN", dominios: ["news.cn", "xinhuanet.com"], categoria: "estatal" as const };

/** Linha GKG mínima de teste (só as colunas usadas). */
function linha(dominio: string, url: string, titulo: string | null): string[] {
  const l = Array.from({ length: 27 }, () => "");
  l[COL.data] = "20261115103000";
  l[COL.dominio] = dominio;
  l[COL.url] = url;
  l[COL.extras] = titulo ? `<PAGE_TITLE>${titulo}</PAGE_TITLE>` : "";
  return l;
}

describe("xinhua (GKG filtrado por domínio)", () => {
  it("aceita só os domínios da Xinhua (e subdomínios)", () => {
    const ok = normalizarLinhaXinhua(linha("news.cn", "https://english.news.cn/20261115/abc/c.html", "[TESTE] China and partners sign arms control treaty"), fonte);
    expect(ok).toMatchObject({ pais: "CN", orgao: "Xinhua", estatal: true, publicadoEm: "2026-11-15T10:30:00Z" });
    expect(normalizarLinhaXinhua(linha("english.news.cn", "https://english.news.cn/x.html", "[TESTE] Título longo o suficiente"), fonte)).not.toBeNull();
    expect(normalizarLinhaXinhua(linha("globaltimes.cn", "https://www.globaltimes.cn/x.html", "[TESTE] Título longo o suficiente"), fonte)).toBeNull();
    expect(normalizarLinhaXinhua(linha("fakenews.cn", "https://fakenews.cn/x.html", "[TESTE] Título longo o suficiente"), fonte)).toBeNull();
  });

  it("descarta linha sem título ou com título curto", () => {
    expect(normalizarLinhaXinhua(linha("news.cn", "https://english.news.cn/x.html", null), fonte)).toBeNull();
    expect(normalizarLinhaXinhua(linha("news.cn", "https://english.news.cn/x.html", "Curto"), fonte)).toBeNull();
  });
});

describe("xinhua: título e deduplicação", () => {
  it("remove o sufixo do veículo e usa o título como id (URLs espelhadas)", () => {
    const a = normalizarLinhaXinhua(linha("news.cn", "https://english.news.cn/a.html", "[TESTE] Nuclear gamble harms everyone -- Xinhua"), fonte)!;
    const b = normalizarLinhaXinhua(linha("xinhuanet.com", "http://www.xinhuanet.com/b.html", "[TESTE] Nuclear gamble harms everyone - Xinhua"), fonte)!;
    expect(a.tituloOriginal).toBe("[TESTE] Nuclear gamble harms everyone");
    expect(a.hash).toBe(b.hash);
  });
});

describe("xinhua: amostra real do GKG (15/11/2026)", () => {
  it("normaliza todas as linhas, sem o sufixo -Xinhua", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const linhas = readFileSync(path.join(import.meta.dirname, "__fixtures__", "amostra.tsv"), "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"));
    const n = linhas.map((l) => normalizarLinhaXinhua(l, fonte));
    expect(n.length).toBeGreaterThan(0);
    expect(n.every(Boolean)).toBe(true);
    expect(n.some((d) => /xinhua\s*$/i.test(d!.tituloOriginal))).toBe(false);
  });
});
