// Atalho: pnpm ingest:gdelt-doc [--horas N] [--seco] [--amostra N]  ≡  run.ts --fonte gdelt-doc
process.argv.push("--fonte", "gdelt-doc");
await import("./run");

export {};
