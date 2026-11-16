/**
 * Dados estruturados (schema.org em JSON-LD) para buscadores. O "<" é escapado para o conteúdo
 * nunca fechar a tag <script> antes da hora.
 */
export function DadosEstruturados({ dados }: { dados: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\u003c") }} />;
}
