import { describe, expect, it } from "vitest";
import carregador, { degrauPara, miniaturaWikimedia } from "./carregador";

const ORIGINAL =
  "https://upload.wikimedia.org/wikipedia/commons/1/1e/F-35_Demo_Team_%26_Thunderbirds_-_Aviation_Nation_2019.jpg?utm_source=commons.wikimedia.org&utm_content=original";

describe("carregador de imagens do Wikimedia", () => {
  it("escolhe o menor degrau aceito pelo Commons que cobre a largura", () => {
    expect(degrauPara(16)).toBe(250);
    expect(degrauPara(640)).toBe(960);
    expect(degrauPara(1080)).toBe(1280);
    expect(degrauPara(3840)).toBe(1920);
  });

  it("transforma o original em miniatura e descarta a query", () => {
    expect(miniaturaWikimedia(ORIGINAL, 828)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/F-35_Demo_Team_%26_Thunderbirds_-_Aviation_Nation_2019.jpg/960px-F-35_Demo_Team_%26_Thunderbirds_-_Aviation_Nation_2019.jpg",
    );
  });

  it("aceita um endereço que já é miniatura", () => {
    const thumb = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Foto.png/250px-Foto.png";
    expect(miniaturaWikimedia(thumb, 1200)).toBe("https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Foto.png/1280px-Foto.png");
  });

  it("aceita a miniatura em thumb.wikimedia.org devolvida pela API do Commons", () => {
    const thumb =
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Foto.jpg/960px-Foto.jpg?utm_source=commons.wikimedia.org&utm_content=thumbnail";
    expect(miniaturaWikimedia(thumb, 400)).toBe("https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Foto.jpg/500px-Foto.jpg");
  });

  it("gera PNG para SVG", () => {
    expect(miniaturaWikimedia("https://upload.wikimedia.org/wikipedia/commons/a/ab/Mapa.svg", 300)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Mapa.svg/330px-Mapa.svg.png",
    );
  });

  it("recusa imagens fora do Commons e deixa as locais como estão", () => {
    expect(() => miniaturaWikimedia("https://example.org/foto.jpg", 500)).toThrow(/fora do Wikimedia/);
    expect(carregador({ src: "/og.png", width: 500 })).toBe("/og.png");
  });

  it("devolve a cópia do Storage como está e usa 960 px como reserva do Commons", () => {
    const copia = "https://upwjywuaehpaamvhvsyu.supabase.co/storage/v1/object/public/fotos/commons/abc-960.jpg";
    expect(carregador({ src: copia, width: 384 })).toBe(copia);
    expect(carregador({ src: ORIGINAL, width: 384 })).toMatch(/\/960px-F-35_Demo/);
    expect(carregador({ src: ORIGINAL, width: 1920 })).toMatch(/\/960px-F-35_Demo/);
  });

  it("recusa outros buckets e hosts parecidos com o do Supabase", () => {
    expect(() => carregador({ src: "https://x.supabase.co/storage/v1/object/public/outro/a.jpg", width: 500 })).toThrow(/fora do Wikimedia/);
    expect(() => carregador({ src: "https://supabase.co.example.org/storage/v1/object/public/fotos/a.jpg", width: 500 })).toThrow(/fora do Wikimedia/);
  });
});
