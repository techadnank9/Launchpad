#!/usr/bin/env node

/**
 * Reads API keys from .env.local and pushes them to the Convex deployment
 * so backend agents can use them.
 *
 * Usage: npm run env:sync
 */

import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const KEYS_TO_SYNC = [
  "OPENAI_API_KEY",
  "FIBER_API_KEY",
  "ORANGESLICE_API_KEY",
];

const OPTIONAL_KEYS = [
  "ORANGESLICE_BASE_URL",
  "POSTIZ_API_KEY",
  "POSTIZ_BASE_URL",
  "POSTIZ_LINKEDIN_INTEGRATION_ID",
  "POSTIZ_X_INTEGRATION_ID",
  "POSTIZ_INSTAGRAM_INTEGRATION_ID",
  "COMPOSIO_CONSUMER_API_KEY",
  "COMPOSIO_API_KEY",
  "COMPOSIO_LINKEDIN_AUTH_CONFIG_ID",
  "COMPOSIO_USER_ID",
  "COMPOSIO_DASHBOARD_WORKSPACE",
  "COMPOSIO_TWITTER_AUTH_CONFIG_ID",
  "COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID",
  "AGENTMAIL_API_KEY",
  "AGENTMAIL_INBOX_ID",
  "AGENTMAIL_REPLY_TO",
  "AGENTMAIL_SANDBOX_INBOX",
  "AGENTMAIL_DEMO_RECIPIENT",
];

function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

if (!existsSync(envPath)) {
  console.error("\n❌  .env.local not found.\n");
  console.error("    cp .env.local.example .env.local");
  console.error("    # paste your keys, then run npm run env:sync again\n");
  process.exit(1);
}

const vars = parseEnvFile(readFileSync(envPath, "utf8"));

// Accept legacy ORANGE_SLICE_API_KEY name in .env.local
if (!vars.ORANGESLICE_API_KEY?.trim() && vars.ORANGE_SLICE_API_KEY?.trim()) {
  vars.ORANGESLICE_API_KEY = vars.ORANGE_SLICE_API_KEY;
}

const missing = KEYS_TO_SYNC.filter((k) => !vars[k]?.trim());

if (missing.length > 0) {
  console.error("\n❌  Missing values in .env.local:\n");
  for (const key of missing) console.error(`    ${key}=`);
  console.error("\n    Paste your keys and run npm run env:sync again.\n");
  process.exit(1);
}

console.log("\nSyncing API keys to Convex…\n");

let failed = false;
for (const key of KEYS_TO_SYNC) {
  const value = vars[key].trim();
  const masked =
    value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : "****";
  const result = spawnSync("npx", ["convex", "env", "set", key, value], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CONVEX_AGENT_MODE: process.env.CONVEX_AGENT_MODE ?? "anonymous" },
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`    ✗ ${key}`);
  } else {
    console.log(`    ✓ ${key} (${masked})`);
  }
}

if (failed) {
  console.error("\n❌  Some keys failed to sync. Is `npx convex dev` configured?\n");
  process.exit(1);
}

for (const key of OPTIONAL_KEYS) {
  const value = vars[key]?.trim();
  if (!value) continue;
  const result = spawnSync("npx", ["convex", "env", "set", key, value], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CONVEX_AGENT_MODE: process.env.CONVEX_AGENT_MODE ?? "anonymous" },
  });
  if (result.status === 0) {
    console.log(`    ✓ ${key} (optional)`);
  }
}

if (!vars.POSTIZ_API_KEY?.trim() || !vars.POSTIZ_BASE_URL?.trim()) {
  console.log(
    "\nℹ️  Postiz not configured — inbound posts will stay in Autogrow's calendar only.",
  );
}

if (
  !vars.COMPOSIO_CONSUMER_API_KEY?.trim() &&
  (!vars.COMPOSIO_API_KEY?.trim() ||
    !vars.COMPOSIO_LINKEDIN_AUTH_CONFIG_ID?.trim())
) {
  console.log(
    "\nℹ️  Composio not configured — approve will use Postiz or local scheduling only.",
  );
}

if (
  !vars.AGENTMAIL_API_KEY?.trim() ||
  !vars.AGENTMAIL_INBOX_ID?.trim()
) {
  console.log(
    "\nℹ️  AgentMail not configured — outbound drips stay on timeline only until keys are set.",
  );
} else {
  console.log(
    "\nℹ️  Outbound email is sandbox-only → autogrowreciever@agentmail.to (never real prospect emails).",
  );
}

console.log("\n✓  All keys synced. Restart `npm run dev` if it is already running.\n");
