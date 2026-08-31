import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const parents = sqliteTable(
  "parents",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    addedByEmail: text("added_by_email"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_parents_email").on(table.email)],
);

export const children = sqliteTable(
  "children",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    accent: text("accent").notNull().default("gold"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_children_sort_order").on(table.sortOrder)],
);

export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    comment: text("comment").notNull().default(""),
    effectiveAt: text("effective_at").notNull(),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_ledger_entries_child_effective").on(
      table.childId,
      table.effectiveAt,
    ),
  ],
);

export const interestSettings = sqliteTable(
  "interest_settings",
  {
    id: text("id").primaryKey(),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    annualRateBps: integer("annual_rate_bps").notNull().default(0),
    paymentSchedule: text("payment_schedule").notNull().default("monthly"),
    updatedByEmail: text("updated_by_email").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_interest_settings_child").on(table.childId)],
);
