// Atalho: pnpm ingest:ucdp-candidato [--seco]  ≡  run.ts --fonte ucdp-candidato
process.argv.push("--fonte", "ucdp-candidato");
await import("./run");

export {};
