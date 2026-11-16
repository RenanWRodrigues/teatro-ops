// Atalho: pnpm ingest:fr-eua [--seco] [--horas N]  ≡  run.ts --fonte fr-eua
process.argv.push("--fonte", "fr-eua");
await import("./run");

export {};
