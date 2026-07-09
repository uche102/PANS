import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const electionSiteDir = path.join(repoRoot, "election-site");
const adminPortalDir = path.join(repoRoot, "pans-admin-portal");
const backendDir = path.join(repoRoot, "pans-backend");
const voterOutputDir = path.join(backendDir, "dist-voter");
const adminOutputDir = path.join(backendDir, "dist-admin");

rmSync(voterOutputDir, { recursive: true, force: true });
rmSync(adminOutputDir, { recursive: true, force: true });
mkdirSync(voterOutputDir, { recursive: true });
mkdirSync(adminOutputDir, { recursive: true });

execFileSync("npm", ["run", "build"], {
  cwd: electionSiteDir,
  stdio: "inherit",
});

execFileSync("npm", ["run", "build"], {
  cwd: adminPortalDir,
  stdio: "inherit",
});

cpSync(path.join(electionSiteDir, "dist"), voterOutputDir, {
  recursive: true,
  force: true,
});
cpSync(path.join(adminPortalDir, "dist"), adminOutputDir, {
  recursive: true,
  force: true,
});
