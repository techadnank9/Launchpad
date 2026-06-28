import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildObsidianVault } from "../lib/obsidian-vault";
import { toBoardLead } from "../lib/pipeline-board";
import type { Doc } from "../convex/_generated/dataModel";

function convexRun(functionPath: string, args: Record<string, unknown>): unknown {
  const json = JSON.stringify(args);
  const out = execSync(`npx convex run ${functionPath} '${json.replace(/'/g, "'\\''")}'`, {
    cwd: path.join(import.meta.dirname, ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out);
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const runId =
  process.argv[2] ??
  (convexRun("runs:getLatestRun", {}) as Doc<"runs">)._id;

const run = convexRun("runs:getRun", { runId }) as Doc<"runs"> | null;
if (!run) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

const personas = convexRun("personas:listByRun", { runId }) as Doc<"personas">[];
const rawLeads = convexRun("leads:listByRun", { runId }) as Array<
  Doc<"leads"> & { personaId: Doc<"personas">["_id"] }
>;

const personaById = Object.fromEntries(personas.map((persona) => [persona._id, persona]));
const leads = rawLeads.map((lead) =>
  toBoardLead(lead, personaById[lead.personaId] ?? { name: "Unknown persona" }),
);

const hostname = hostnameFromUrl(run.url);
const vault = buildObsidianVault({ run, personas, leads, hostname });
const outDir = path.resolve(
  process.env.HOME ?? "",
  "Documents",
  "Obsidian Vaults",
  vault.vaultName,
);

mkdirSync(outDir, { recursive: true });
for (const file of vault.files) {
  const target = path.join(outDir, file.path);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, file.content, "utf8");
}

console.log(`Exported ${vault.files.length} notes to:\n${outDir}`);

try {
  execSync(`open -a Obsidian ${JSON.stringify(outDir)}`, { stdio: "ignore" });
  console.log("Opened Obsidian with the vault folder.");
} catch {
  console.log("Obsidian app not found — open the folder manually in Obsidian.");
}
