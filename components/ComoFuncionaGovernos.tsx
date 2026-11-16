/** Método e ressalvas do monitor de governos (mesmo texto em /governos e /governos/[pais]). */
export function ComoFuncionaGovernos() {
  return (
    <section aria-labelledby="titulo-como">
      <div className="container-ops py-12">
        <h2 id="titulo-como" className="font-mono text-xs tracking-[0.14em] text-accent">
          COMO FUNCIONA
        </h2>
        <div className="mt-3 flex max-w-[760px] flex-col gap-3 text-sm leading-relaxed text-text-2">
          <p>
            Coletamos os canais oficiais de cada governo (sites, feeds e o Federal Register, diário oficial dos EUA) e, onde não há canal
            oficial acessível, agências de notícias estatais (Xinhua, IRNA). Guardamos só o título, a data e o link. Entram os itens que tratam
            de defesa, sanções, conflitos e negociações, armamentos, inteligência artificial (IA) militar, orçamento de defesa, exercícios
            militares ou acordos; agenda protocolar, cultura e economia doméstica ficam de fora. O tipo (sanção, lei, comunicado…) é classificado
            automaticamente por palavras-chave e pode errar.
          </p>
          <p>
            Os títulos são traduzidos automaticamente e reproduzem a versão de cada governo ou agência, <strong>sem verificação independente</strong>{" "}
            do portal. Agências de notícias controladas pelo Estado levam o selo &ldquo;Mídia estatal&rdquo;. Todos os países têm a mesma estrutura e
            o mesmo destaque; a diferença no volume de itens reflete o acesso aos canais oficiais, não a importância de cada país. Os países
            aparecem em ordem alfabética.
          </p>
        </div>
      </div>
    </section>
  );
}
