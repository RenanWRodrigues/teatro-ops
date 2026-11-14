import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  weight: ["700", "800"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const NOME = "TEATRO//OPS";
const DESCRICAO =
  "Conflitos armados, arsenal militar, táticas, guerra tecnológica e decisões de governos — em português, com fonte em cada dado.";

export const metadata: Metadata = {
  title: { default: NOME, template: `%s · ${NOME}` },
  description: DESCRICAO,
  applicationName: NOME,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: NOME,
    title: NOME,
    description: DESCRICAO,
  },
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
