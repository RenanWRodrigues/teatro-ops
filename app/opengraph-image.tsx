// Imagem de compartilhamento padrão (Open Graph/Twitter) gerada no build: marca e lema em pt-BR.
import { ImageResponse } from "next/og";

export const alt = "TEATRO//OPS — conflitos, arsenal, táticas e tecnologia militar, em português e com fontes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0a0c0b",
        color: "#e8eae6",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#f2a900" }}>{"// INTELIGÊNCIA DE DEFESA"}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 120, fontWeight: 800, letterSpacing: 4 }}>
          TEATRO<span style={{ color: "#f2a900" }}>{"//"}</span>OPS
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: "#b8beb5", maxWidth: 980 }}>
          Conflitos, arsenal, táticas e tecnologia militar — em português, com fonte em cada dado.
        </div>
      </div>
    </div>,
    size,
  );
}
