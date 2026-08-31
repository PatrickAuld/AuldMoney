import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const optional = process.argv.includes("--optional");
const configPath = resolve("wrangler.jsonc");
const wranglerPath = resolve("node_modules/wrangler/bin/wrangler.js");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const binding = config.d1_databases?.find((database) => database.binding === "DB");

if (!binding) throw new Error("wrangler.jsonc is missing the DB binding.");

const configuredId = process.env.D1_DATABASE_ID?.trim();
let databaseId = configuredId;

if (!databaseId) {
  try {
    const output = execFileSync(
      process.execPath,
      [wranglerPath, "d1", "list", "--json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
    );
    const databases = JSON.parse(output);
    const database = databases.find((item) => item.name === binding.database_name);
    databaseId = database?.uuid ?? database?.id;
  } catch (error) {
    if (optional && !process.env.CI) {
      console.warn("D1 resolution skipped; no authenticated Cloudflare session was available.");
      process.exit(0);
    }
    throw error;
  }
}

if (!databaseId) {
  throw new Error(
    `D1 database '${binding.database_name}' does not exist. Run 'npm run db:create' once, then retry the deployment.`,
  );
}

binding.database_id = databaseId;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Resolved D1 database '${binding.database_name}'.`);
