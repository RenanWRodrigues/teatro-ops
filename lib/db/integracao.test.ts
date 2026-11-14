// Integração com um Supabase LOCAL (supabase start). Rode com: pnpm test:db
// Usa variáveis TESTE_SUPABASE_* (preenchidas pelo script a partir de `supabase status`) para nunca
// atingir o projeto remoto por engano. Sem elas, os testes são pulados.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buscarEquipamentoBanco,
  listarConflitos,
  listarEquipamentos,
  listarEventosPublicos,
  listarFontes,
  listarManchetes,
  ultimaAtualizacao,
} from "./consultas";
import { paraConflito, paraEquipamento, paraManchete } from "./esquemas";
import { processarNoticias, retraduzirPendentes } from "@/lib/ingestao/noticias";
import { registrarExecucao } from "@/lib/fontes/_base/execucao";
import { hashUrl } from "@/lib/fontes/_base/url";
import { criarTravador } from "@/lib/traducao/glossario";
import type { AdaptadorFonte, NoticiaNormalizada } from "@/lib/fontes/_base/tipos";

const url = process.env.TESTE_SUPABASE_URL;
const anonKey = process.env.TESTE_SUPABASE_ANON_KEY;
const serviceKey = process.env.TESTE_SUPABASE_SERVICE_ROLE_KEY;
const configurado = Boolean(url && anonKey && serviceKey);

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
let anon: SupabaseClient;
let admin: SupabaseClient;

const SLUG = "teste-integracao";
const HASH = "teste-integracao";

async function limpar() {
  await admin.from("midias").delete().eq("equipamento_slug", SLUG);
  await admin.from("equipamentos").delete().eq("slug", SLUG);
  await admin.from("eventos").delete().like("hash", `${HASH}%`);
  await admin.from("conflitos").delete().eq("slug", SLUG);
  await admin.from("noticias").delete().eq("hash", HASH);
  await admin.from("execucoes_ingestao").delete().eq("job", "teste");
}

const ok = <T,>(r: { error: { message: string } | null; data: T }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

describe.skipIf(!configurado)("Supabase local: consultas reais via PostgREST", () => {
  beforeAll(async () => {
    anon = createClient(url!, anonKey!, opcoes);
    admin = createClient(url!, serviceKey!, opcoes);
    await limpar();

    const hoje = new Date().toISOString().slice(0, 10);
    const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    ok(
      await admin.from("conflitos").insert({
        slug: SLUG,
        nome_pt: "[TESTE] Conflito",
        paises: ["XX"],
        regiao: "Teste",
        intensidade: "alta",
        lon: 30,
        lat: 50,
        fontes: [{ nome: "[TESTE] Fonte", url: "https://exemplo.org", licenca: "CC BY 4.0" }],
      }),
    );
    ok(
      await admin.from("noticias").insert({
        hash: HASH,
        fonte_id: "gdelt-doc",
        url: "https://exemplo.org/noticia",
        titulo_original: "[TEST] Headline",
        titulo_pt: "[TESTE] Manchete",
        regiao: "Teste",
        publicado_em: new Date().toISOString(),
      }),
    );
    ok(
      await admin.from("equipamentos").insert({
        slug: SLUG,
        nome: "[TESTE] Caça",
        categoria: "cacas",
        pais_origem: ["XX"],
        wikipedia_pt: "Teste",
        resumo_pt: "Resumo de teste.",
        specs: {
          velocidade_max: { valor: 1.6, unidade: "mach", fonte: "Wikidata", url: "https://www.wikidata.org/wiki/Q1", licenca: "CC0" },
          comprimento: { valor: 15.7, unidade: "m", fonte: "Wikidata" },
          envergadura: { valor: 10.7, unidade: "m", fonte: "Wikidata" },
        },
      }),
    );
    ok(
      await admin.from("midias").insert({
        equipamento_slug: SLUG,
        url: "https://upload.wikimedia.org/wikipedia/commons/teste.jpg",
        legenda_pt: "[TESTE] Foto",
        autor: "Autor de teste",
        licenca: "CC BY-SA 4.0",
        fonte_url: "https://commons.wikimedia.org/wiki/File:teste.jpg",
      }),
    );
    ok(
      await admin.from("eventos").insert([
        { hash: `${HASH}-hoje`, fonte_id: "acled", conflito_slug: SLUG, data: hoje, pais: "XX", lat: 50.123456, lon: 30.987654 },
        { hash: `${HASH}-ontem`, fonte_id: "acled", conflito_slug: SLUG, data: ontem, pais: "XX", lat: 50.123456, lon: 30.987654 },
      ]),
    );
    ok(
      await admin.from("execucoes_ingestao").insert([
        { job: "teste", fonte_id: "gdelt-doc", terminado_em: "2026-11-14T12:00:00Z" },
        { job: "teste", fonte_id: "gdelt-doc", terminado_em: "2026-11-14T13:00:00Z", erro: "detalhe interno" },
      ]),
    );
  }, 30_000);

  afterAll(async () => {
    if (admin) await limpar();
  });

  it("o seed carregou as fontes de config/fontes.yaml", async () => {
    const r = await listarFontes(anon);
    expect(r.ok && r.dados.length).toBeGreaterThan(20);
  });

  it("manchete traz o nome e a licença da fonte pela relação noticias → fontes", async () => {
    const r = await listarManchetes(50, anon);
    if (!r.ok) throw new Error(r.motivo);
    const linha = r.dados.find((l) => l.url === "https://exemplo.org/noticia");
    expect(linha).toBeDefined();
    expect(paraManchete(linha!)).toMatchObject({
      titulo: "[TESTE] Manchete",
      fonte: { nome: "exemplo.org, via GDELT", licenca: expect.any(String) },
    });
  });

  it("conflito vem com fontes jsonb e coordenadas", async () => {
    const r = await listarConflitos(anon);
    if (!r.ok) throw new Error(r.motivo);
    const c = paraConflito(r.dados.find((l) => l.slug === SLUG)!);
    expect(c).toMatchObject({ intensidade: "alta", coordenadas: [30, 50], fonte: { nome: "[TESTE] Fonte" } });
  });

  it("equipamento e mídias viram ficha com fonte por valor e foto creditada", async () => {
    const lista = await listarEquipamentos(anon);
    expect(lista.ok && lista.dados.some((l) => l.slug === SLUG)).toBe(true);

    const r = await buscarEquipamentoBanco("cacas", SLUG, anon);
    if (!r.ok || !r.dados) throw new Error("ficha não encontrada");
    const e = paraEquipamento(r.dados.linha, r.dados.midias);
    expect(e.destaque).toBe("Mach 1,6");
    expect(e.planta?.envergadura.valor).toBe(10.7);
    expect(e.galeria?.[0]).toMatchObject({ autor: "Autor de teste", licenca: "CC BY-SA 4.0" });
    expect(e.resumo?.fonte.licenca).toBe("CC BY-SA 4.0");

    const outraCategoria = await buscarEquipamentoBanco("tanques", SLUG, anon);
    expect(outraCategoria).toEqual({ ok: true, dados: null });
  });

  it("eventos: anon não lê a tabela bruta; a view pública atrasa 24 h e agrega coordenadas", async () => {
    const bruto = await anon.from("eventos").select("hash").like("hash", `${HASH}%`);
    expect(bruto.error?.message).toMatch(/permission denied/);

    const r = await listarEventosPublicos({ conflito: SLUG }, anon);
    if (!r.ok) throw new Error(r.motivo);
    expect(r.dados.map((e) => [e.lat, e.lon])).toEqual([[50.1, 31]]);
  });

  it("carimbo de atualização ignora execuções com erro e não expõe a mensagem", async () => {
    expect(await ultimaAtualizacao(["teste"], anon)).toEqual({ ok: true, dados: "2026-11-14T12:00:00+00:00" });
    const log = await anon.from("execucoes_ingestao").select("erro");
    expect(log.error?.message).toMatch(/permission denied/);
  });

  it("anon não consegue escrever", async () => {
    const r = await anon.from("conflitos").insert({ slug: "invasor", nome_pt: "x", paises: [], regiao: "x" });
    expect(r.error?.message).toMatch(/permission denied|row-level security/);
    await anon.from("fontes").delete().eq("id", "gdelt-doc");
    const aindaExiste = await admin.from("fontes").select("id").eq("id", "gdelt-doc");
    expect(aindaExiste.data).toHaveLength(1);
  });
});

// ── Pipeline de ingestão contra o banco local (adaptador falso, sem rede e sem motores de tradução) ──

describe.skipIf(!configurado)("Supabase local: pipeline de notícias", () => {
  const urls = ["https://exemplo.org/teste-pipeline-1", "https://exemplo.org/teste-pipeline-2"];
  const adaptador: AdaptadorFonte<NoticiaNormalizada, NoticiaNormalizada> = {
    id: "gdelt-doc",
    buscar: async () =>
      urls.map((url, i) => ({
        hash: hashUrl(url),
        url,
        tituloOriginal: i === 0 ? "[TESTE] Notícia em português" : "[TEST] English headline about Ukraine",
        idiomaOriginal: i === 0 ? "pt" : "en",
        dominio: "exemplo.org",
        paises: i === 0 ? [] : ["UA"],
        temas: ["conflitos"],
        regiao: i === 0 ? null : "Europa Oriental",
        publicadoEm: "2026-11-14T10:00:00Z",
      })),
    normalizar: (n) => n,
    hash: (n) => n.hash,
  };
  const traducao = () => ({
    cache: { ler: async () => new Map<string, string>(), gravar: async () => {} },
    travador: criarTravador([]),
    deepl: null,
    libre: null,
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from("noticias").delete().in("hash", urls.map(hashUrl));
    await admin.from("execucoes_ingestao").delete().eq("job", "teste-pipeline");
  });

  it("grava, é idempotente e registra a execução", async () => {
    await admin.from("noticias").delete().in("hash", urls.map(hashUrl));
    const inicio = new Date();
    const primeira = await processarNoticias(admin, adaptador, new Date(0), traducao(), { log: () => {} });
    expect(primeira.resultado.itensNovos).toBe(2);
    expect(primeira.linhas.map((l) => l.titulo_pt)).toEqual(["[TESTE] Notícia em português", null]);

    const segunda = await processarNoticias(admin, adaptador, new Date(0), traducao(), { log: () => {} });
    expect(segunda.resultado).toMatchObject({ itensNovos: 0, itensIgnorados: 2 });

    await registrarExecucao(admin, "teste-pipeline", "gdelt-doc", inicio, primeira.resultado);
    const { data } = await admin.from("execucoes_ingestao").select("itens_novos, erro").eq("job", "teste-pipeline");
    expect(data).toEqual([{ itens_novos: 2, erro: null }]);

    // Numa execução seguinte com motor disponível, o pendente é traduzido.
    const comMotor = { ...traducao(), libre: { traduzir: async (t: string[]) => t.map((x) => `PT ${x}`) } };
    const re = await retraduzirPendentes(admin, comMotor, { limite: 500 });
    expect(re.traduzidos).toBeGreaterThanOrEqual(1);
    const { data: depois } = await admin.from("noticias").select("titulo_pt").eq("url", urls[1]);
    expect(depois?.[0]?.titulo_pt).toBe("PT [TEST] English headline about Ukraine");
    await admin.from("noticias").update({ titulo_pt: null }).eq("url", urls[1]);

    // O site lê a tradução pendente como o título original com o selo.
    const r = await listarManchetes(50, anon);
    if (!r.ok) throw new Error(r.motivo);
    const pendente = r.dados.find((l) => l.url === urls[1]);
    expect(pendente && paraManchete(pendente)).toMatchObject({ traducaoPendente: true, titulo: "[TEST] English headline about Ukraine" });
  });
});
