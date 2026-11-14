// Atalho: pnpm ingest:gdelt-gkg [--horas N] [--seco] [--amostra N]  ≡  run.ts --fonte gdelt-gkg
process.argv.push("--fonte", "gdelt-gkg");
await import("./run");

export {};
