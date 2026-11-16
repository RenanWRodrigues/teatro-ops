// Atalho: pnpm ingest:xinhua [--seco] [--horas N]  ≡  run.ts --fonte xinhua
process.argv.push("--fonte", "xinhua");
await import("./run");

export {};
