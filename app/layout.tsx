import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import { NOME_SITE, urlDoSite } from "@/lib/site";
import "./globals.css";

// Desempenho (Fase 10): só o subconjunto "latin" (cobre todo o português) é pré-carregado. Com "latin-ext",
// eram nove arquivos de fonte disputando a rede no 1º acesso, e a Inter chegava tarde: o texto era repintado
// e o LCP da home passava de 2,5 s em 4G. Caracteres raros (ex.: "ć") usam a fonte de reserva.
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  weight: ["700", "800"],
  subsets: ["latin"],
  display: "swap",
});

// Fonte mono só aparece em rótulos pequenos: não é pré-carregada, para não competir com a Inter do texto.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Texto corrido: "optional" evita a troca tardia de fonte, que repintava o parágrafo maior da página e
// empurrava o LCP. Se a Inter não chegar a tempo no 1º acesso, vale a reserva com métricas ajustadas
// (adjustFontFallback); nas páginas seguintes ela já está em cache.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "optional",
});

const NOME = NOME_SITE;
const DESCRICAO =
  "Conflitos armados, arsenal militar, táticas, guerra tecnológica e decisões de governos — em português, com fonte em cada dado.";

export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite()),
  title: { default: NOME, template: `%s · ${NOME}` },
  description: DESCRICAO,
  applicationName: NOME,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: NOME,
    title: NOME,
    description: DESCRICAO,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: NOME, description: DESCRICAO },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0c0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${barlow.variable} ${jetbrains.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:px-4 focus:py-3 focus:font-mono focus:text-sm focus:text-bg"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
