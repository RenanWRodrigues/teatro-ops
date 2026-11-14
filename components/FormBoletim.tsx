"use client";

import { useState, type FormEvent } from "react";

/** Inscrição no boletim diário. Ainda sem serviço de e-mail (precisa ser gratuito; ver CLAUDE.md §1.2). */
export function FormBoletim() {
  const [aviso, setAviso] = useState("");

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAviso("O boletim por e-mail ainda não está disponível. Nenhum dado foi enviado.");
  }

  return (
    <form onSubmit={enviar} className="flex flex-[1_1_460px] flex-wrap gap-3">
      <label htmlFor="email-boletim" className="sr-only">
        E-mail
      </label>
      <input
        id="email-boletim"
        type="email"
        required
        autoComplete="email"
        placeholder="seu@email.com"
        className="h-14 min-w-0 flex-[1_1_260px] border border-line-strong bg-surface-3 px-[18px] font-mono text-[15px] text-text placeholder:text-muted"
      />
      <button
        type="submit"
        className="h-14 bg-accent px-7 font-display text-xl font-bold tracking-[0.06em] text-bg uppercase hover:bg-accent-hover"
      >
        Inscrever-se
      </button>
      <p role="status" className="w-full font-mono text-xs text-text-2 empty:hidden">
        {aviso}
      </p>
    </form>
  );
}
