import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run db:add-parent -- parent@example.com");
  process.exit(1);
}

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const sql = `INSERT INTO parents (id, email, display_name, added_by_email)
VALUES (lower(hex(randomblob(16))), ${quote(email)}, ${quote(email.split("@")[0])}, 'wrangler-setup')
ON CONFLICT(email) DO NOTHING;`;

execFileSync(
  process.execPath,
  [
    resolve("node_modules/wrangler/bin/wrangler.js"),
    "d1",
    "execute",
    "auldmoney",
    "--remote",
    "--command",
    sql,
  ],
  { stdio: "inherit" },
);

console.log(`Parent ${email} is authorized in AuldMoney.`);
