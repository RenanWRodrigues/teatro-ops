// Atalho: pnpm ingest:governos [--seco] [--horas N]  ≡  run.ts --job governos (todos os feeds oficiais ativos)
process.argv.push("--job", "governos");
await import("./run");

export {};
