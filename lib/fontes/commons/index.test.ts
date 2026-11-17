import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { escolherFotos, licencaLivre, normalizarArquivo, pontuarFoto, type FotoCommons } from ".";

const amostra = JSON.parse(readFileSync(path.join(import.meta.dirname, "__fixtures__", "f-35a-categoria.json"), "utf8"));

describe("Wikimedia Commons (amostra real da categoria F-35A Lightning II, 15/11/2026)", () => {
  const fotos = (amostra.query.pages as unknown[]).flatMap((p) => normalizarArquivo(p) ?? []);

  it("toda foto aceita tem autor, licença livre e página do arquivo", () => {
    expect(fotos.length).toBeGreaterThan(0);
    for (const f of fotos) {
      expect(f.autor.length).toBeGreaterThan(0);
      expect(licencaLivre(f.licenca)).toBe(true);
      expect(f.paginaUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(f.autor).not.toMatch(/<[^>]+>/);
    }
  });

  it("escolha prioriza o equipamento e descarta bastidores com pessoas", () => {
    const escolhidas = escolherFotos(fotos);
    for (const f of escolhidas) expect(pontuarFoto(f)).not.toBeNull();
    expect(escolhidas.some((f) => /maint|tires|load competition/i.test(f.arquivo))).toBe(false);
  });
});

describe("licencaLivre", () => {
  it.each(["Public domain", "CC0", "CC BY 2.0", "CC BY-SA 4.0", "CC BY-SA 3.0"])("aceita %s", (l) => expect(licencaLivre(l)).toBe(true));
  it.each(["CC BY-NC 2.0", "CC BY-ND 4.0", "CC BY-NC-SA 2.0", "Fair use", ""])("recusa %s", (l) => expect(licencaLivre(l)).toBe(false));
});

describe("pontuarFoto", () => {
  const f = (arquivo: string, descricao: string | null = null, largura: number | null = 2000): Pick<FotoCommons, "arquivo" | "descricao" | "largura"> => ({ arquivo, descricao, largura });
  it("recusa mapas, selos e diagramas (casos reais do S-400, Patriot e Javelin, 17/11/2026)", () => {
    for (const arquivo of ["S-400 operators.png", "S-400_missile_operators_(fix).png", "Worldmap-MIM104-S300.png", "Stamp of Russia 2013 No 1688 Obukhov Plant.jpg", "1-27 Top attack flight path..PNG", "Shahed-136-operators-pngs.png"]) {
      expect(pontuarFoto(f(arquivo)), arquivo).toBeNull();
    }
    expect(pontuarFoto(f("TBMD-1.jpg", "Ranges of the air defence systems IRIS-T SLM, Patriot and MEADS"))).toBeNull();
    expect(pontuarFoto(f("Зоны поражения ракет ЗРК С-400.png"))).toBeNull();
    expect(pontuarFoto(f("S-400 SAM during the Victory parade 2010.jpg"))).not.toBeNull();
    expect(pontuarFoto(f("Iron Dome near Sderot.jpg"))).not.toBeNull();
  });

  it("recusa imagens de ataque (equipamento na mira ou destruído)", () => {
    expect(pontuarFoto(f("Russian S-400 targeted by Ukrainian UAV.png"))).toBeNull();
    expect(pontuarFoto(f("S-400 explodes.jpg", "The moment of detonation of a Russian S-400 destroyed by the Armed Forces"))).toBeNull();
    expect(pontuarFoto(f("Leopard 2A7 at Eurosatory.jpg", "Leopard 2A7 on static display"))).not.toBeNull();
  });
  it("prefere voo/navegação, recusa manutenção e fotos pequenas", () => {
    expect(pontuarFoto(f("F-35A takes off at Hill AFB.jpg"))).toBe(2);
    expect(pontuarFoto(f("F-35A at Luke.jpg"))).toBe(1);
    expect(pontuarFoto(f("33rd AMXS supplies F-35 maintainers.jpg"))).toBeNull();
    expect(pontuarFoto(f("F-35A.jpg", "Airmen attend a change of command ceremony"))).toBeNull();
    expect(pontuarFoto(f("F-35A.jpg", null, 400))).toBeNull();
  });
});

describe("normalizarArquivo sem autor", () => {
  const pagina = (licenca: string) => ({
    title: "File:Exemplo.jpg",
    imageinfo: [
      {
        url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Exemplo.jpg",
        descriptionurl: "https://commons.wikimedia.org/wiki/File:Exemplo.jpg",
        mime: "image/jpeg",
        extmetadata: { LicenseShortName: { value: licenca } },
      },
    ],
  });

  it("descarta CC BY/BY-SA sem autor (a licença exige atribuição) e aceita domínio público", () => {
    expect(normalizarArquivo(pagina("CC BY-SA 4.0"))).toBeNull();
    expect(normalizarArquivo(pagina("Public domain"))?.autor).toBe("autor não identificado (ver página do arquivo)");
  });
});
