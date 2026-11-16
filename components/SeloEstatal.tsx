/** Selo "Mídia estatal": agência de notícias controlada pelo Estado (Xinhua, IRNA…), não um órgão de governo. */
export function SeloEstatal({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center border border-line-strong px-2 py-0.5 font-mono text-[11px] tracking-[0.1em] text-text-2 uppercase ${className}`}
      title="Agência de notícias controlada pelo Estado"
    >
      Mídia estatal
    </span>
  );
}
