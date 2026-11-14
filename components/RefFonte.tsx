/** Chamada numerada "[n]" que leva à fonte correspondente na lista #ref-n da página. */
export function RefFonte({ numero, className = "" }: { numero: number; className?: string }) {
  return (
    <a
      href={`#ref-${numero}`}
      className={`ml-1 align-super font-mono text-[10px] text-accent no-underline hover:text-accent-hover ${className}`}
    >
      <span className="sr-only">fonte </span>[{numero}]
    </a>
  );
}
