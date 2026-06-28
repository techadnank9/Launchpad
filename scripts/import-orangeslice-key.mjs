#!/usr/bin/env node

/**
 * Copies the Orange Slice API key from CLI login into .env.local.
 *
 * Orange Slice is an npm package (not MCP). Authenticate first:
 *   npx orangeslice@latest login
 *   npm run orangeslice:import
 *   npm run env:sync
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");
const configPath = resolve(homedir(), ".config/orangeslice/config.json");

if (!existsSync(configPath)) {
  console.error("\n❌  No Orange Slice key found on this machine.\n");
  console.error("    Run this first (a browser window will open):\n");
  console.error("      npx orangeslice@latest login\n");
  console.error("    Then run again:\n");
  console.error("      npm run orangeslice:import\n");
  process.exit(1);
}

const { apiKey } = JSON.parse(readFileSync(configPath, "utf8"));
if (!apiKey?.startsWith("osk_")) {
  console.error("\n❌  ~/.config/orangeslice/config.json has no valid apiKey.\n");
  console.error("      npx orangeslice@latest login\n");
  process.exit(1);
}

let envContent = existsSync(envPath)
  ? readFileSync(envPath, "utf8")
  : "";

const keyLine = `ORANGESLICE_API_KEY=${apiKey}`;

if (/^ORANGESLICE_API_KEY=.*/m.test(envContent)) {
  envContent = envContent.replace(/^ORANGESLICE_API_KEY=.*/m, keyLine);
} else if (/^ORANGE_SLICE_API_KEY=.*/m.test(envContent)) {
  envContent = envContent.replace(/^ORANGE_SLICE_API_KEY=.*/m, keyLine);
} else {
  if (envContent.length > 0 && !envContent.endsWith("\n")) envContent += "\n";
  envContent += `\n# --- Orange Slice (imported from CLI login) ---\n${keyLine}\n`;
}

writeFileSync(envPath, envContent, "utf8");

const masked = `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`;
console.log(`\n✓  Wrote ORANGESLICE_API_KEY to .env.local (${masked})`);
console.log("\n    Next: npm run env:sync\n");
