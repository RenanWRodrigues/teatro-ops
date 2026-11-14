/** Cantoneiras de mira (2 px âmbar) para painéis de destaque. O pai precisa ser `relative`. */
export function Cantoneiras() {
  return (
    <>
      <span aria-hidden="true" className="absolute -top-1.5 -left-1.5 size-[18px] border-t-2 border-l-2 border-accent" />
      <span aria-hidden="true" className="absolute -right-1.5 -bottom-1.5 size-[18px] border-r-2 border-b-2 border-accent" />
    </>
  );
}
