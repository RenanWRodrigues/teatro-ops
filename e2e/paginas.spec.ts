import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const ROTAS = ["/", "/arsenal", "/arsenal/cacas/f-35a-lightning-ii", "/tecnologia", "/taticas", "/taticas/movimento-de-pinca", "/arquivo", "/fontes", "/metodologia", "/busca?q=drones"];

// /tecnologia não tem mais fixtures: todo o conteúdo vem de content/tecnologia/ e do banco.
// /taticas também: os textos vêm de content/taticas/.
const temAvisoExemplo = (rota: string) => rota !== "/tecnologia" && !rota.startsWith("/taticas") && !["/arquivo", "/fontes", "/metodologia"].includes(rota) && !rota.startsWith("/busca");
// Seções editoriais em rascunho somem da página; o teste da seção só roda quando publicada.
const onuPublicada = /^status: publicado$/m.test(
  readFileSync(path.join(process.cwd(), "content/tecnologia/humano-no-circuito.yaml"), "utf8"),
);

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

    test("tem um único h1 e o aviso de dados de exemplo só quando há fixture", async ({ page }) => {
      await page.goto(rota);
      await expect(page.locator("h1")).toHaveCount(1);
      if (temAvisoExemplo(rota)) await expect(page.getByRole("note")).toContainText("[EXEMPLO]");
      else await expect(page.getByText("[EXEMPLO]")).toHaveCount(0);
    });
  });
}

// Rotas que só passam pelo axe e pela largura de 375 px (o aviso [EXEMPLO] depende dos dados de cada uma).
for (const rota of ["/conflitos", "/conflitos/russia-ucrania", "/governos", "/governos/china", "/arsenal/cacas", "/arsenal/comparar", "/rota-inexistente"]) {
  test(`acessibilidade e largura em ${rota}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(rota);
    const resultado = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude(".maplibregl-canvas")
      .analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    const { scroll, largura } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, largura: window.innerWidth }));
    expect(scroll).toBeLessThanOrEqual(largura);
    await expect(page.locator("h1")).toHaveCount(1);
  });
}

test("cards de conflito não aninham links (HTML válido, sem erro de hidratação)", async ({ page }) => {
  await page.goto("/conflitos");
  await page.goto("/");
  expect(await page.locator("a a").count()).toBe(0);
});

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

test("cada aba de /tecnologia mostra o texto explicativo com fontes numeradas", async ({ page }) => {
  await page.goto("/tecnologia");
  const painel = page.getByRole("tabpanel");
  await page.getByRole("tab", { name: /Guerra eletrônica/ }).click();
  for (const secao of ["O que é", "Contexto histórico", "Debate ético e regulatório", "Fontes"]) {
    await expect(painel.getByRole("heading", { level: 3, name: secao, exact: true })).toBeVisible();
  }
  const chamada = painel.locator('a[href="#ref-guerra-eletronica-1"]').first();
  await expect(chamada).toBeVisible();
  await expect(painel.locator("#ref-guerra-eletronica-1")).toContainText("RUSI");
  await expect(painel.getByText("[EXEMPLO] fonte a definir")).toHaveCount(0);
});

test("linha do tempo de /tecnologia cita uma fonte em cada marco", async ({ page }) => {
  await page.goto("/tecnologia");
  const secao = page.locator("section", { has: page.getByRole("heading", { name: "A ascensão dos drones" }) });
  const marcos = secao.locator("ol").first().locator("> li");
  expect(await marcos.count()).toBeGreaterThanOrEqual(5);
  for (const marco of await marcos.all()) await expect(marco.locator('a[href^="#ref-linha-"]').first()).toBeVisible();
  await expect(secao.locator("#ref-linha-1")).toBeAttached();
});

test("Humano no circuito? cita fonte em cada item (quando publicado)", async ({ page }) => {
  test.skip(!onuPublicada, "seção em rascunho");
  await page.goto("/tecnologia");
  const secao = page.locator("section", { has: page.getByRole("heading", { name: "Humano no circuito?" }) });
  await expect(secao.getByRole("heading", { level: 3, name: "Andamento na ONU" })).toBeVisible();
  for (const item of await secao.locator("ol").first().locator("> li").all()) {
    await expect(item.locator('a[href^="#ref-onu-"]').first()).toBeAttached();
  }
  await expect(secao.locator("#ref-onu-1")).toBeAttached();
});

test("indicadores de /tecnologia mostram o volume semanal (ou o aviso) com fonte e carimbo", async ({ page }) => {
  await page.goto("/tecnologia");
  const secao = page.locator("section", { has: page.getByRole("heading", { name: "Notícias por semana" }) });
  const grafico = secao.getByRole("img", { name: /^Drones: / });
  const aviso = secao.getByText(/Contagem indisponível|Ainda não há notícias coletadas/);
  expect((await grafico.count()) > 0 || (await aviso.isVisible())).toBe(true);
  await expect(secao.getByRole("link", { name: /^Projeto GDELT/ })).toBeVisible();
  await expect(secao.getByText(/Atualizado em|Sem atualização registrada ainda/)).toBeVisible();
});

test("cada aba de /tecnologia mostra notícias do seu tópico (ou o aviso de vazio) e o carimbo", async ({ page }) => {
  await page.goto("/tecnologia");
  const painel = page.getByRole("tabpanel");
  for (const [aba, rotulo] of [
    [/Drones FPV/, "Drones FPV"],
    [/Guerra eletrônica/, "Guerra eletrônica"],
  ] as const) {
    await page.getByRole("tab", { name: aba }).click();
    await expect(painel.getByRole("heading", { level: 3, name: `Notícias recentes · ${rotulo}` })).toBeVisible();
    await expect(painel.getByText(/^Notícias classificadas no tema /)).toBeVisible();
    const cards = painel.getByRole("article");
    const vazio = painel.getByText("Nenhuma notícia recente coletada para este tópico.", { exact: false });
    expect((await cards.count()) > 0 || (await vazio.isVisible())).toBe(true);
    await expect(painel.getByText(/Atualizado em|Sem atualização registrada ainda/)).toBeVisible();
  }
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
  // O rótulo muda com o estado; sem aria-pressed, para o leitor não anunciar "Retomar…, pressionado".
  const retomar = page.getByRole("button", { name: /Retomar rolagem/ });
  await expect(retomar).toBeVisible();
  await expect(retomar).not.toHaveAttribute("aria-pressed");
  // Parado, as manchetes viram lista vertical (o trilho horizontal some).
  await expect(page.getByRole("region", { name: "Lista de manchetes" })).toBeHidden();
  const lista = page.locator(".ticker-lista");
  await expect(lista).toBeVisible();
  expect(await lista.locator("li").count()).toBeGreaterThan(0);
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

test("ticker pausado troca o trilho por lista vertical que quebra linha", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Pausar rolagem/ }).click();
  await expect(page.locator(".ticker-copia")).toBeHidden();
  const lista = page.locator(".ticker-lista");
  await expect(lista).toHaveCSS("flex-direction", "column");
  const { scroll, largura } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, largura: window.innerWidth }));
  expect(scroll).toBeLessThanOrEqual(largura);
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

for (const rota of ["/conflitos", "/conflitos/russia-ucrania"]) {
  test.describe(`rota ${rota}`, () => {
    test("sem violações de acessibilidade WCAG A/AA (axe)", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(rota);
      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .exclude(".maplibregl-canvas")
        .analyze();
      expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });

    test("sem rolagem horizontal e com um único h1", async ({ page }) => {
      await page.goto(rota);
      const { scroll, largura } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, largura: window.innerWidth }));
      expect(scroll).toBeLessThanOrEqual(largura);
      await expect(page.locator("h1")).toHaveCount(1);
    });
  });
}

test("/conflitos lista os 28 conflitos curados em tabela, com link para cada página", async ({ page }) => {
  await page.goto("/conflitos");
  const linhas = page.locator("table tbody tr");
  await expect(linhas).toHaveCount(28);
  await page.getByRole("link", { name: "Guerra no Sudão" }).click();
  await expect(page).toHaveURL(/\/conflitos\/sudao$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guerra no Sudão");
});

test("conflito inexistente devolve 404", async ({ page }) => {
  const resposta = await page.goto("/conflitos/nao-existe");
  expect(resposta?.status()).toBe(404);
});

for (const rota of ["/governos", "/governos/russia", "/governos/israel"]) {
  test.describe(`rota ${rota}`, () => {
    test("sem violações de acessibilidade WCAG A/AA (axe)", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(rota);
      const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });

    test("sem rolagem horizontal e com um único h1", async ({ page }) => {
      await page.goto(rota);
      const { scroll, largura } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, largura: window.innerWidth }));
      expect(scroll).toBeLessThanOrEqual(largura);
      await expect(page.locator("h1")).toHaveCount(1);
    });
  });
}

test("/governos mostra os 7 países com a mesma estrutura e link para cada linha do tempo", async ({ page }) => {
  await page.goto("/governos");
  for (const nome of ["Alemanha", "China", "Estados Unidos", "Irã", "Israel", "Rússia", "Ucrânia"]) {
    await expect(page.getByRole("heading", { level: 3, name: nome })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /^Linha do tempo/ })).toHaveCount(7);
  await page.getByRole("link", { name: "Linha do tempo da Ucrânia →" }).click();
  await expect(page).toHaveURL(/\/governos\/ucrania$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ucrânia");
});

test("/governos lista as fontes, inclusive as sem acesso automático, com selo de mídia estatal", async ({ page }) => {
  await page.goto("/governos");
  const tabela = page.getByRole("table", { name: /Canais oficiais monitorados/ });
  await expect(tabela.getByRole("row", { name: /Xinhua/ })).toContainText("Mídia estatal");
  await expect(tabela.getByRole("row", { name: /Presidência da Ucrânia/ })).toContainText("Sem acesso automático");
  await expect(tabela.getByRole("row", { name: /Presidência da Rússia/ })).toContainText("Coleta automática");
});

test("a navegação principal leva a /governos", async ({ page }) => {
  await page.goto("/conflitos");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Governos" }).click();
  await expect(page).toHaveURL(/\/governos$/);
});

test("país fora do monitor devolve 404", async ({ page }) => {
  const resposta = await page.goto("/governos/franca");
  expect(resposta?.status()).toBe(404);
});

test("catálogo do arsenal pagina e filtra por país", async ({ page }) => {
  await page.goto("/arsenal");
  const contador = page.locator("p[aria-live=polite]").first();
  await expect(contador).toContainText("página 1 de 2");
  await page.getByRole("navigation", { name: "Paginação" }).getByRole("button", { name: "Página 2" }).click();
  await expect(contador).toContainText("página 2 de 2");
  await expect(page.locator("#lista-equipamentos ul > li")).toHaveCount(3);
  await page.getByLabel("País de origem").selectOption("Brasil");
  await expect(contador).not.toContainText("página");
  await expect(page.locator("#lista-equipamentos ul > li")).toHaveCount(3);
});

test.describe("rota /arsenal/comparar", () => {
  test("sem violações de acessibilidade, sem rolagem horizontal e com um único h1", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/arsenal/comparar?a=f-35a-lightning-ii&b=su-57");
    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    const { scroll, largura } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, largura: window.innerWidth }));
    expect(scroll).toBeLessThanOrEqual(largura);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("a escolha fica na URL", async ({ page }) => {
    await page.goto("/arsenal/comparar");
    await page.getByLabel("Equipamento A").selectOption("rafale");
    await page.getByLabel("Equipamento B").selectOption("su-57");
    await expect(page).toHaveURL(/a=rafale/);
    await expect(page).toHaveURL(/b=su-57/);
    await expect(page.getByRole("heading", { level: 2 })).toContainText("Rafale");
  });
});

test("táticas: lista leva ao texto, que tem diagrama, seções e fontes numeradas", async ({ page }) => {
  await page.goto("/taticas");
  const cards = page.getByRole("list").filter({ has: page.getByRole("heading", { level: 2 }) }).locator("> li");
  expect(await cards.count()).toBe(6);
  await page.getByRole("link", { name: "Defesa em profundidade" }).click();
  await expect(page).toHaveURL(/\/taticas\/defesa-em-profundidade$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Defesa em profundidade");
  await expect(page.getByRole("img", { name: /Diagrama esquemático/ })).toBeVisible();
  for (const secao of ["O que é", "Casos históricos", "Fontes"]) {
    await expect(page.getByRole("heading", { level: 2, name: secao, exact: true })).toBeVisible();
  }
  await expect(page.locator("#ref-defesa-em-profundidade-1")).toBeAttached();
  await expect(page.getByText("[EXEMPLO]")).toHaveCount(0);
});

test("tática inexistente devolve 404", async ({ page }) => {
  const resposta = await page.goto("/taticas/nao-existe");
  expect(resposta?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
  await expect(page.getByRole("link", { name: "Ir para a página inicial" })).toBeVisible();
});

test("arquivo: linha do tempo com fontes e séries do UCDP com tabela", async ({ page }) => {
  await page.goto("/arquivo");
  const marcos = page.locator("section", { has: page.getByRole("heading", { name: "De 1914 a hoje" }) }).locator("ol").first().locator("> li");
  expect(await marcos.count()).toBeGreaterThanOrEqual(10);
  for (const marco of await marcos.all()) await expect(marco.locator('a[href^="#ref-arquivo-"]').first()).toBeAttached();
  await expect(page.getByRole("img", { name: /^Conflitos armados com participação de Estado por ano, de 1946 a / })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Mortes em combate .* de 1989 a / })).toBeVisible();
  await expect(page.getByText(/UCDP\/PRIO Armed Conflict Dataset e UCDP Battle-Related Deaths Dataset, versão \d+\.\d+/)).toBeVisible();
  await page.getByText("Ver os valores em tabela").first().click();
  await expect(page.getByRole("table", { name: "Conflitos armados com participação de Estado por ano" }).getByRole("row", { name: /^1946 / })).toBeVisible();
});

test("fontes: lista do registro com licença e situação; rodapé leva a fontes e metodologia", async ({ page }) => {
  await page.goto("/fontes");
  await expect(page.getByRole("heading", { level: 2, name: "Conflitos, eventos e notícias" })).toBeVisible();
  const gkg = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /GDELT GKG/ }) });
  await expect(gkg).toContainText("Coletando");
  await expect(gkg).toContainText("Licença");
  await expect(page.getByText("[preencher]")).toHaveCount(0);
  await page.getByRole("contentinfo").getByRole("link", { name: "Metodologia" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Metodologia");
  for (const s of ["De onde vêm os dados", "Como traduzimos", "Limitações", "Correções e contato"]) {
    await expect(page.getByRole("heading", { level: 2, name: s })).toBeVisible();
  }
});

test("busca: formulário leva a /busca?q= e mostra resultado ou aviso de indisponibilidade", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Buscar no site" }).click();
  await expect(page).toHaveURL(/\/busca$/);
  await page.getByRole("searchbox", { name: "Termo de busca" }).fill("drones");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/busca\?q=drones$/);
  await expect(page.getByRole("searchbox", { name: "Termo de busca" })).toHaveValue("drones");
  // Sem banco no e2e, a página explica em vez de quebrar.
  await expect(page.getByText(/Busca temporariamente indisponível|resultados? para “drones”|Nenhum resultado/)).toBeVisible();
});

test("busca com termo curto pede mais letras", async ({ page }) => {
  await page.goto("/busca?q=a");
  await expect(page.getByText("Digite pelo menos duas letras para buscar.")).toBeVisible();
});

test("SEO: sitemap, robots, Open Graph em pt-BR, canônico e dados estruturados", async ({ page, request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/taticas/movimento-de-pinca</loc>");
  expect(sitemap).toContain("/arquivo</loc>");
  expect(sitemap).not.toContain("/busca");

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/busca/);
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

  const imagem = await request.get("/opengraph-image");
  expect(imagem.headers()["content-type"]).toContain("image/png");

  await page.goto("/arsenal");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /^Arsenal — catálogo de equipamentos · TEATRO\/\/OPS$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/arsenal$/);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /opengraph-image/);

  await page.goto("/arquivo");
  const dataset = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(dataset).toMatchObject({ "@type": "Dataset", inLanguage: "pt-BR", license: "https://creativecommons.org/licenses/by/4.0/" });

  await page.goto("/taticas/movimento-de-pinca");
  const artigo = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  expect(artigo).toMatchObject({ "@type": "Article", headline: "Movimento de pinça", inLanguage: "pt-BR" });
  expect(artigo.citation.length).toBeGreaterThan(0);

  await page.goto("/busca?q=drones");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("ticker com movimento reduzido mostra lista vertical sem rolagem", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".ticker-lista")).toBeVisible();
  await expect(page.locator(".ticker-trilho")).toBeHidden();
});

test("abas de /tecnologia: os cinco painéis estão no HTML, só o ativo visível", async ({ page }) => {
  await page.goto("/tecnologia");
  expect(await page.locator('[role="tabpanel"]').count()).toBe(5);
  expect(await page.locator('[role="tabpanel"]:not([hidden])').count()).toBe(1);
  const aba = page.getByRole("tab", { name: /Enxames/ });
  const painel = page.locator(`#${await aba.getAttribute("aria-controls")}`);
  await expect(painel).toBeHidden();
  await aba.click();
  await expect(painel).toBeVisible();
});

test("títulos de fontes em inglês levam lang=en", async ({ page }) => {
  await page.goto("/taticas/movimento-de-pinca");
  await expect(page.locator("#ref-movimento-de-pinca-2 a").first()).toHaveAttribute("lang", "en");
});
