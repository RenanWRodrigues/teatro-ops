"use client";

import { useEffect, useRef, useState } from "react";
import type { Conflito, Intensidade } from "@/lib/tipos";
import { ROTULOS_INTENSIDADE, SeloIntensidade } from "./SeloIntensidade";

// OpenFreeMap: tiles gratuitos e sem chave (docs/APIS.md). A atribuição OSM vem no próprio estilo.
const ESTILO = "https://tiles.openfreemap.org/styles/dark";

const COR: Record<Intensidade, string> = { alta: "#E5483D", tensao: "#F2A900", "cessar-fogo": "#B5BCB6" };

const LOCALE_PT_BR = {
  "AttributionControl.ToggleAttribution": "Mostrar/ocultar créditos do mapa",
  "AttributionControl.MapFeedback": "Sugerir correção no mapa",
  "FullscreenControl.Enter": "Tela cheia",
  "FullscreenControl.Exit": "Sair da tela cheia",
  "LogoControl.Title": "Logotipo do MapLibre",
  "Map.Title": "Mapa",
  "Marker.Title": "Marcador",
  "NavigationControl.ResetBearing": "Voltar ao norte",
  "NavigationControl.ZoomIn": "Aproximar",
  "NavigationControl.ZoomOut": "Afastar",
  "Popup.Close": "Fechar",
  "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + rolagem para aproximar o mapa",
  "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para aproximar o mapa",
  "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
};

type Estado = "ocioso" | "carregando" | "pronto" | "erro";

type Props = {
  conflitos: Conflito[];
  className?: string;
};

/**
 * Mapa MapLibre carregado só no cliente e só quando entra na tela.
 * A alternativa em texto é a lista de conflitos exibida ao lado (ver home).
 */
export function MapaConflitos({ conflitos, className = "" }: Props) {
  const alvo = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<Estado>("ocioso");

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;
    let mapa: import("maplibre-gl").Map | undefined;
    let cancelado = false;

    const iniciar = async () => {
      setEstado("carregando");
      try {
        // JS e CSS do MapLibre só são baixados quando o mapa entra na tela.
        const [maplibre] = await Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css")]);
        if (cancelado) return;
        mapa = new maplibre.Map({
          container: el,
          style: ESTILO,
          center: [20, 25],
          zoom: 1.2,
          cooperativeGestures: true,
          attributionControl: { compact: false },
          locale: LOCALE_PT_BR,
        });
        mapa.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        mapa.on("load", () => {
          // Se um erro anterior marcou "erro" mas o estilo terminou de carregar, o mapa volta a valer.
          if (!cancelado) setEstado("pronto");
        });
        mapa.on("error", (ev) => {
          // Falha de tile isolada não derruba o mapa; só marcamos erro se o estilo não carregou.
          if (!mapa?.isStyleLoaded() && !cancelado) {
            console.warn("[MapaConflitos]", ev.error?.message);
            setEstado("erro");
          }
        });
        for (const c of conflitos) {
          if (!c.coordenadas) continue;
          new maplibre.Marker({ color: COR[c.intensidade] })
            .setLngLat(c.coordenadas)
            .setPopup(
              new maplibre.Popup({ offset: 24 }).setText(
                `${c.nome} — ${ROTULOS_INTENSIDADE[c.intensidade]} (fonte: ${c.fonte.nome})`,
              ),
            )
            .addTo(mapa);
        }
      } catch (erro) {
        // Ex.: navegador sem WebGL.
        console.warn("[MapaConflitos]", erro);
        if (!cancelado) setEstado("erro");
      }
    };

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          observador.disconnect();
          void iniciar();
        }
      },
      { rootMargin: "200px" },
    );
    observador.observe(el);

    return () => {
      cancelado = true;
      observador.disconnect();
      mapa?.remove();
    };
  }, [conflitos]);

  return (
    <div
      className={`placeholder-listrado relative min-w-0 overflow-hidden border border-line ${className}`}
      role="region"
      aria-label="Mapa de conflitos. A mesma informação está na lista de conflitos."
    >
      <div ref={alvo} className="absolute inset-0" />
      {estado !== "pronto" ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-mono text-[13px] tracking-[0.1em] text-muted">
          {estado === "erro"
            ? "Mapa indisponível neste navegador. Veja a lista de conflitos."
            : "Carregando mapa…"}
        </p>
      ) : null}
      <div className="pointer-events-none absolute bottom-10 left-3 flex flex-wrap gap-2 sm:left-5">
        <SeloIntensidade intensidade="alta" variante="chip" />
        <SeloIntensidade intensidade="tensao" variante="chip" />
        <SeloIntensidade intensidade="cessar-fogo" variante="chip" />
      </div>
    </div>
  );
}
