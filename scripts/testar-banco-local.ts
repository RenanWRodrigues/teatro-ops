// Roda lib/db/integracao.test.ts contra o Supabase LOCAL (`supabase start`).
// Lê URL e chaves de `supabase status` e recusa qualquer URL que não seja localhost.
import { execFileSync, spawnSync } from "node:child_process";
import { z } from "zod";

const shell = process.platform === "win32";
const bruto = execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8", shell });
const status = z
  .object({ API_URL: z.string(), ANON_KEY: z.string(), SERVICE_ROLE_KEY: z.string() })
  .parse(JSON.parse(bruto.slice(bruto.indexOf("{"))));

const host = new URL(status.API_URL).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) {
  throw new Error(`Recusado: ${host} não é local. Este teste só roda contra o Supabase local.`);
}

const r = spawnSync("pnpm", ["vitest", "run", "lib/db/integracao.test.ts"], {
  stdio: "inherit",
  shell,
  env: {
    ...process.env,
    TESTE_SUPABASE_URL: status.API_URL,
    TESTE_SUPABASE_ANON_KEY: status.ANON_KEY,
    TESTE_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  },
});
process.exit(r.status ?? 1);
