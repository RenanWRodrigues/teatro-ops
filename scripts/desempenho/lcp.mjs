// Mede o LCP das rotas principais com rede 4G lenta e CPU 4× mais lenta (perfil "celular" do Lighthouse).
// Uso: pnpm build && pnpm start -p 3200 (em outro terminal) ; node scripts/desempenho/lcp.mjs [url-base]
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3200";
const ROTAS = process.argv[3] ? process.argv[3].split(",") : ["/", "/conflitos", "/conflitos/russia-ucrania", "/governos", "/arsenal", "/arsenal/cacas/rafale", "/tecnologia", "/taticas", "/taticas/movimento-de-pinca", "/arquivo", "/fontes", "/metodologia"];
const META_MS = 2500;

const navegador = await chromium.launch();
let falhas = 0;
for (const rota of ROTAS) {
  const ctx = await navegador.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75 });
  const pagina = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pagina);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await pagina.addInitScript(() => {
    window.__lcp = 0;
    window.__lcpEl = "?";
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__lcp = e.startTime;
        const el = e.element;
        window.__lcpEl = el ? `${el.tagName.toLowerCase()} "${(el.getAttribute("alt") ?? el.textContent ?? "").trim().slice(0, 40)}"${e.url ? " " + e.url.slice(0, 60) : ""}` : "?";
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  // Aquece o cache do servidor (ISR) antes de medir: mede o que o visitante vê, não a 1ª renderização.
  await fetch(BASE + rota).catch(() => null);
  await pagina.goto(BASE + rota, { waitUntil: "load", timeout: 60_000 });
  await pagina.waitForTimeout(1500);
  const lcp = await pagina.evaluate(() => window.__lcp);
  const elemento = await pagina.evaluate(() => window.__lcpEl);
  const ok = lcp < META_MS;
  if (!ok) falhas++;
  console.log(`${ok ? "ok " : "LENTO"} ${String(Math.round(lcp)).padStart(5)} ms  ${rota}  ← ${elemento}`);
  await ctx.close();
}
await navegador.close();
console.log(falhas ? `\n${falhas} rota(s) acima de ${META_MS} ms.` : `\nTodas as rotas abaixo de ${META_MS} ms.`);
process.exit(falhas ? 1 : 0);
