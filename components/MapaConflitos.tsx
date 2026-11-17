"use client";

import { useEffect, useRef, useState } from "react";
import type { Intensidade, PontoMapa } from "@/lib/tipos";
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

/** Camadas de rótulos do estilo (países, estados, cidades, mares) que passam a usar o nome em português. */
const CAMADAS_COM_NOME = /^(place_|water_name$)/;

/**
 * O estilo do OpenFreeMap rotula em inglês (`name_en`). Os tiles do OpenMapTiles trazem `name:pt`:
 * usamos esse nome quando existe e mantemos a expressão original do estilo como reserva.
 */
function rotulosEmPortugues(mapa: import("maplibre-gl").Map) {
  for (const camada of mapa.getStyle().layers) {
    if (camada.type !== "symbol" || !CAMADAS_COM_NOME.test(camada.id)) continue;
    const original: unknown = mapa.getLayoutProperty(camada.id, "text-field");
    // Só expressões e textos fixos entram no `coalesce`; funções no formato antigo (`stops`) ficam como estão.
    if (typeof original !== "string" && !Array.isArray(original)) continue;
    mapa.setLayoutProperty(camada.id, "text-field", ["coalesce", ["get", "name:pt"], original as import("maplibre-gl").ExpressionSpecification]);
  }
}

/** Conflito mostrado como marcador: ponto agregado do teatro, nunca posição de tropa. */
export type MarcadorConflito = {
  slug: string;
  nome: string;
  intensidade: Intensidade | null;
  coordenadas?: [number, number];
};

export type CamadasMapaProps = { eventos?: PontoMapa[]; cobertura?: PontoMapa[] };

type IdCamada = "eventos" | "cobertura";

const CAMADAS: Record<IdCamada, { rotulo: string; cor: string; fonte: string }> = {
  eventos: { rotulo: "Eventos (3 meses)", cor: "#E5483D", fonte: "UCDP" },
  cobertura: { rotulo: "Cobertura de mídia (7 dias)", cor: "#F2A900", fonte: "GDELT" },
};

type Props = {
  conflitos: MarcadorConflito[];
  camadas?: CamadasMapaProps;
  /** Mostra os botões de camadas acima do mapa (página /conflitos). */
  controles?: boolean;
  /** Prefixo do link no popup do marcador (ex.: "/conflitos/"). */
  prefixoLink?: string;
  className?: string;
};

const geojson = (pontos: PontoMapa[] = []) => ({
  type: "FeatureCollection" as const,
  features: pontos.map((p) => ({
    type: "Feature" as const,
    properties: { valor: p.valor, rotulo: p.rotulo },
    geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
  })),
});

/**
 * Mapa MapLibre carregado só no cliente e só quando entra na tela.
 * A alternativa em texto é a lista/tabela de conflitos da página.
 */
export function MapaConflitos({ conflitos, camadas, controles, prefixoLink, className = "" }: Props) {
  const alvo = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<import("maplibre-gl").Map | null>(null);
  const [estado, setEstado] = useState<Estado>("ocioso");
  const [visiveis, setVisiveis] = useState<Record<IdCamada, boolean>>({ eventos: true, cobertura: false });
  // Visibilidade inicial lida no carregamento sem reiniciar o mapa a cada clique.
  const visiveisRef = useRef(visiveis);
  useEffect(() => {
    visiveisRef.current = visiveis;
  }, [visiveis]);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;
    let cancelado = false;

    const iniciar = async () => {
      setEstado("carregando");
      try {
        // JS e CSS do MapLibre só são baixados quando o mapa entra na tela.
        const [maplibre] = await Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css")]);
        if (cancelado) return;
        // O MapLibre 6 procura o worker ao lado do próprio arquivo (import.meta.url), mas o Turbopack
        // não copia esse arquivo para o bundle — sem isto o mapa falha com "Worker failed to load".
        // O `new URL(..., import.meta.url)` faz o bundler emitir o worker como asset.
        maplibre.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
        const mapa = new maplibre.Map({
          container: el,
          style: ESTILO,
          center: [20, 20],
          zoom: 1.2,
          renderWorldCopies: false,
          cooperativeGestures: true,
          attributionControl: { compact: false },
          locale: LOCALE_PT_BR,
        });
        mapaRef.current = mapa;
        mapa.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

        mapa.on("load", () => {
          if (cancelado) return;
          rotulosEmPortugues(mapa);
          for (const id of Object.keys(CAMADAS) as IdCamada[]) {
            const pontos = camadas?.[id];
            if (!pontos || pontos.length === 0) continue;
            const max = Math.max(...pontos.map((p) => p.valor), 1);
            mapa.addSource(id, { type: "geojson", data: geojson(pontos) });
            mapa.addLayer({
              id,
              type: "circle",
              source: id,
              layout: { visibility: visiveisRef.current[id] ? "visible" : "none" },
              paint: {
                // Área proporcional ao valor (raiz quadrada), de 3 a 26 px.
                "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "valor"]], 1, 3, Math.max(Math.sqrt(max), 1.01), 26],
                "circle-color": CAMADAS[id].cor,
                "circle-opacity": 0.35,
                "circle-stroke-color": CAMADAS[id].cor,
                "circle-stroke-width": 1,
              },
            });
            mapa.on("click", id, (ev) => {
              const f = ev.features?.[0];
              if (!f) return;
              new maplibre.Popup({ offset: 8 })
                .setLngLat(ev.lngLat)
                .setText(`${String(f.properties?.rotulo ?? "")} — fonte: ${CAMADAS[id].fonte}`)
                .addTo(mapa);
            });
          }
          setEstado("pronto");
        });
        mapa.on("error", (ev) => {
          // Falha de tile isolada não derruba o mapa; só marcamos erro se o estilo não carregou.
          if (!mapa.isStyleLoaded() && !cancelado) {
            console.warn("[MapaConflitos]", ev.error?.message);
            setEstado("erro");
          }
        });

        for (const c of conflitos) {
          if (!c.coordenadas) continue;
          const conteudo = document.createElement("div");
          const titulo = document.createElement("strong");
          titulo.textContent = c.nome;
          conteudo.append(titulo, document.createElement("br"), c.intensidade ? ROTULOS_INTENSIDADE[c.intensidade] : "Abaixo do limiar");
          if (prefixoLink) {
            const a = document.createElement("a");
            a.href = `${prefixoLink}${c.slug}`;
            a.textContent = "Ver página do conflito";
            conteudo.append(document.createElement("br"), a);
          }
          const marcador = new maplibre.Marker({ color: c.intensidade ? COR[c.intensidade] : "#6B746D" })
            .setLngLat(c.coordenadas)
            .setPopup(new maplibre.Popup({ offset: 24 }).setDOMContent(conteudo))
            .addTo(mapa);
          // Acessibilidade (WCAG 2.4.6 e 2.4.11): cada marcador tem nome próprio e fica fora da ordem de Tab —
          // a lista/tabela de conflitos ao lado é a alternativa por teclado, e marcadores fora da área
          // visível do mapa recebiam foco invisível.
          const elMarcador = marcador.getElement();
          elMarcador.setAttribute("aria-label", `${c.nome} — ${c.intensidade ? ROTULOS_INTENSIDADE[c.intensidade] : "abaixo do limiar"}`);
          elMarcador.setAttribute("tabindex", "-1");
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
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
  }, [conflitos, camadas, prefixoLink]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || estado !== "pronto") return;
    for (const id of Object.keys(CAMADAS) as IdCamada[]) {
      if (mapa.getLayer(id)) mapa.setLayoutProperty(id, "visibility", visiveis[id] ? "visible" : "none");
    }
  }, [visiveis, estado]);

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      {controles ? (
        <div role="group" aria-label="Camadas do mapa" className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(CAMADAS) as IdCamada[]).map((id) => {
            const total = camadas?.[id]?.length ?? 0;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={visiveis[id]}
                disabled={total === 0}
                onClick={() => setVisiveis((v) => ({ ...v, [id]: !v[id] }))}
                className={`inline-flex min-h-11 items-center gap-2 border px-3 font-mono text-xs uppercase disabled:cursor-not-allowed ${
                  visiveis[id] && total > 0 ? "border-text-2 text-text" : "border-line-strong text-text-2"
                }`}
              >
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: CAMADAS[id].cor }} />
                {CAMADAS[id].rotulo}
                {total === 0 ? " · sem dados" : ""}
              </button>
            );
          })}
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 border border-line-strong px-3 font-mono text-xs text-text-2 uppercase"
          >
            Impacto humanitário · aguardando ReliefWeb
          </button>
        </div>
      ) : null}
      <div
        className="placeholder-listrado relative min-h-0 flex-1 overflow-hidden border border-line"
        role="region"
        aria-label="Mapa de conflitos. A mesma informação está na lista de conflitos."
      >
        {/* O CSS do MapLibre põe `position: relative` no contêiner do mapa e, por não estar numa camada,
            vence o `absolute` do Tailwind — o mapa ficava com altura 0. Por isso o mapa vai num filho. */}
        <div className="absolute inset-0">
          <div ref={alvo} className="size-full" />
        </div>
        {estado !== "pronto" ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-mono text-[13px] tracking-[0.1em] text-muted">
            {estado === "erro" ? "Mapa indisponível neste navegador. Veja a lista de conflitos." : "Carregando mapa…"}
          </p>
        ) : null}
        <div className="pointer-events-none absolute bottom-10 left-3 flex flex-wrap gap-2 sm:left-5">
          <SeloIntensidade intensidade="alta" variante="chip" />
          <SeloIntensidade intensidade="tensao" variante="chip" />
        </div>
      </div>
    </div>
  );
}
