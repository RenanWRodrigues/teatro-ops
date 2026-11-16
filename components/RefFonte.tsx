/** Chamada numerada "[n]" que leva à fonte correspondente na lista #ref-n da página (ou #<prefixo>-n). */
export function RefFonte({ numero, className = "", prefixo = "ref" }: { numero: number; className?: string; prefixo?: string }) {
  return (
    <a
      href={`#${prefixo}-${numero}`}
      className={`ml-1 align-super font-mono text-[10px] text-accent no-underline hover:text-accent-hover ${className}`}
    >
      <span className="sr-only">fonte </span>[{numero}]
    </a>
  );
}
