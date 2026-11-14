import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROTAS = ["/", "/arsenal", "/arsenal/cacas/f-35a-lightning-ii", "/tecnologia"];

for (const rota of ROTAS) {
  test.describe(`rota ${rota}`, () => {
    test("sem violações de acessibilidade WCAG A/AA (axe)", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(rota);
      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        // Só o canvas WebGL do MapLibre fica de fora (a alternativa é a lista de conflitos);
        // controles e créditos do mapa continuam sendo verificados.
        .exclude(".maplibregl-canvas")
        .analyze();
      const resumo = resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
      expect(resumo).toEqual([]);
    });

    test("sem rolagem horizontal", async ({ page }) => {
      await page.goto(rota);
      const { scroll, largura } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        largura: window.innerWidth,
      }));
      expect(scroll).toBeLessThanOrEqual(largura);
    });

    test("tem um único h1 e o aviso de dados de exemplo", async ({ page }) => {
      await page.goto(rota);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("note")).toContainText("[EXEMPLO]");
    });
  });
}

test("filtros do arsenal funcionam", async ({ page }) => {
  await page.goto("/arsenal");
  const contador = page.getByText(/equipamentos? ·/i);
  await expect(contador).toHaveText(/15 equipamentos · Todos/i);

  await page.getByRole("button", { name: "Tanques" }).click();
  await expect(page.getByRole("button", { name: "Tanques" })).toHaveAttribute("aria-pressed", "true");
  await expect(contador).toHaveText(/3 equipamentos · Tanques/i);

  await page.getByRole("button", { name: "Todos" }).click();
  await page.getByLabel("Buscar equipamento").fill("brasil");
  await expect(contador).toHaveText(/3 equipamentos/i);

  await page.getByLabel("Buscar equipamento").fill("xyz-inexistente");
  await expect(page.getByText("Nenhum equipamento encontrado")).toBeVisible();
});

test("abas de /tecnologia funcionam com clique e teclado", async ({ page }) => {
  await page.goto("/tecnologia");
  const painel = page.getByRole("tabpanel");
  await expect(painel.getByRole("heading", { level: 2 })).toHaveText("Drones FPV");

  await page.getByRole("tab", { name: /Enxames/ }).click();
  await expect(painel.getByRole("heading", { level: 2 })).toHaveText("Enxames");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /IA de alvos/ })).toBeFocused();
  await expect(page.getByRole("tab", { name: /IA de alvos/ })).toHaveAttribute("aria-selected", "true");
  await expect(painel.getByRole("heading", { level: 2 })).toHaveText("IA na identificação de alvos");

  await page.keyboard.press("End");
  await expect(painel.getByRole("heading", { level: 2 })).toHaveText("Defesa antidrone");
});

test("ficha técnica formata números em pt-BR e lista fontes", async ({ page }) => {
  await page.goto("/arsenal/cacas/f-35a-lightning-ii");
  await expect(page.getByText("Mach 1,6").first()).toBeVisible();
  await expect(page.getByText("15.240 m")).toBeVisible();
  await expect(page.locator("#fontes")).toContainText("FONTES");
  await expect(page.getByRole("navigation", { name: "Trilha de navegação" })).toContainText("F-35A");
});

test("ficha sem especificações mostra aviso em vez de dados inventados", async ({ page }) => {
  await page.goto("/arsenal/tanques/leopard-2a7");
  await expect(page.getByText("Ficha técnica em preparação")).toBeVisible();
});

test("rota inexistente devolve 404", async ({ page }) => {
  const resposta = await page.goto("/arsenal/cacas/nao-existe");
  expect(resposta?.status()).toBe(404);
});

test("ticker pode ser pausado", async ({ page }) => {
  await page.goto("/");
  const botao = page.getByRole("button", { name: /Pausar rolagem/ });
  await botao.click();
  await expect(page.getByRole("button", { name: /Retomar rolagem/ })).toHaveAttribute("aria-pressed", "true");
});

test("categoria inexistente devolve 404", async ({ page }) => {
  const resposta = await page.goto("/arsenal/nao-existe");
  expect(resposta?.status()).toBe(404);
});

test("cada valor da ficha leva à sua fonte com um clique", async ({ page }) => {
  await page.goto("/arsenal/cacas/f-35a-lightning-ii");
  const ref = page.locator('a[href^="#ref-"]').first();
  const alvo = await ref.getAttribute("href");
  await ref.click();
  await expect(page.locator(alvo!)).toBeInViewport();
});

test("foco visível na faixa âmbar usa contorno escuro", async ({ page }) => {
  await page.goto("/");
  const botao = page.getByRole("link", { name: "Entrar no dossiê" });
  await botao.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  // transition-colors anima também a cor do contorno: espera estabilizar.
  await expect.poll(() => botao.evaluate((el) => getComputedStyle(el).outlineColor)).toBe("rgb(10, 12, 11)");
});

test("ticker pausado rola na horizontal e esconde a cópia do loop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Pausar rolagem/ }).click();
  const trilho = page.getByLabel("Lista de manchetes");
  await expect(trilho).toHaveCSS("overflow-x", "auto");
  await expect(page.locator(".ticker-copia")).toBeHidden();
});

test("hero de /tecnologia não corta o texto com espaçamento ampliado (WCAG 1.4.12)", async ({ page }) => {
  await page.goto("/tecnologia");
  await page.addStyleTag({
    content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }",
  });
  const paragrafo = page.getByText("Como inteligência artificial, drones e guerra eletrônica");
  const hero = page.locator("section").first();
  const [p, h] = await Promise.all([paragrafo.boundingBox(), hero.boundingBox()]);
  expect(p && h && p.y + p.height <= h.y + h.height).toBe(true);
});
