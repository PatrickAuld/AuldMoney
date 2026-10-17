import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE ledger_entries (id TEXT PRIMARY KEY, child_id TEXT NOT NULL, amount_cents INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', effective_at TEXT NOT NULL, created_by_email TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
  db.prepare("INSERT INTO ledger_entries (id, child_id, amount_cents, effective_at, created_by_email) VALUES (?, ?, ?, ?, ?)").run("legacy", "kai", 1250, "2026-01-01", "test");
  db.exec(readFileSync(new URL("../drizzle/0002_two_accounts.sql", import.meta.url), "utf8"));
  return db;
}

function balances(db, child) {
  const entries = db.prepare("SELECT amount_cents, account_type FROM ledger_entries WHERE child_id = ?").all(child);
  return {
    virtual: entries.filter(e => e.account_type !== "cash").reduce((sum, e) => sum + e.amount_cents, 0),
    cash: entries.filter(e => e.account_type === "cash").reduce((sum, e) => sum + e.amount_cents, 0),
  };
}

test("migration preserves existing balance as virtual", () => {
  const db = fixture();
  assert.deepEqual(balances(db, "kai"), { virtual: 1250, cash: 0 });
  assert.equal(db.prepare("SELECT account_type FROM ledger_entries WHERE id='legacy'").get().account_type, "virtual");
  db.close();
});

test("virtual and piggy bank credits and debits remain independent, including negative balances", () => {
  const db = fixture();
  const insert = db.prepare("INSERT INTO ledger_entries (id, child_id, account_type, amount_cents, effective_at, created_by_email) VALUES (?, ?, ?, ?, ?, ?)");
  insert.run("vcredit", "kai", "virtual", 500, "2026-01-02", "test");
  insert.run("vdebit", "kai", "virtual", -3000, "2026-01-03", "test");
  insert.run("ccredit", "kai", "cash", 200, "2026-01-04", "test");
  insert.run("cdebit", "kai", "cash", -700, "2026-01-05", "test");
  assert.deepEqual(balances(db, "kai"), { virtual: -1250, cash: -500 });
  assert.deepEqual(balances(db, "orion"), { virtual: 0, cash: 0 });
  db.close();
});

test("interest reads virtual ledger only", () => {
  const db = fixture();
  db.prepare("INSERT INTO ledger_entries (id, child_id, account_type, amount_cents, effective_at, created_by_email) VALUES (?, ?, ?, ?, ?, ?)").run("cash", "kai", "cash", 100000, "2026-01-02", "test");
  const result = db.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS balance FROM ledger_entries WHERE child_id = ? AND (account_type IS NULL OR account_type != 'cash')").get("kai");
  assert.equal(result.balance, 1250);
  db.close();
});
