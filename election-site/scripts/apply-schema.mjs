import { spawn } from "node:child_process";
import process from "node:process";

const connectionString =
  process.env.SUPABASE_PSQL_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_SESSION_POOLER_URL ||
  "";

if (!connectionString) {
  console.error(
    "Missing connection string. Set SUPABASE_PSQL_URL or SUPABASE_SESSION_POOLER_URL to the Supabase session pooler URL from the Connect panel.",
  );
  process.exit(1);
}

const args = [connectionString, "-f", "supabase/schema.sql"];

const child = spawn("psql", args, {
  stdio: "inherit",
  env: {
    ...process.env,
    // Prefer IPv4-safe session pooler routing for Supabase migrations.
    PGHOSTADDR: process.env.PGHOSTADDR || "",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
