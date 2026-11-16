"use client";

// Erro no próprio layout raiz: substitui o <html> inteiro, então não usa fontes nem componentes do site.
export default function ErroGlobal({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Erro · TEATRO//OPS</title>
      </head>
      <body style={{ margin: 0, minHeight: "100vh", background: "#0a0c0b", color: "#e8eae6", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "96px 16px" }}>
          <p style={{ color: "#f2a900", letterSpacing: 2, fontSize: 12 }}>TEATRO//OPS · ERRO</p>
          <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "12px 0 16px" }}>O site está temporariamente indisponível</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>Tente de novo em alguns instantes.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 24, minHeight: 48, padding: "0 24px", background: "#f2a900", color: "#0a0c0b", border: 0, fontSize: 14, cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
