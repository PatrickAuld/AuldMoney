import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  children,
  interestSettings,
  ledgerEntries,
  parents,
} from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import type { DashboardData, PaymentSchedule } from "./types";

export async function requireParent() {
  const user = await getChatGPTUser();
  if (!user) return null;

  const db = getDb();
  const existingParents = await db.select().from(parents).limit(1);
  if (!existingParents.length) {
    await db
      .insert(parents)
      .values({
        id: crypto.randomUUID(),
        email: user.email.toLowerCase(),
        displayName: user.fullName,
        addedByEmail: user.email.toLowerCase(),
      })
      .onConflictDoNothing();
    await seedChildren();
  }

  const [parent] = await db
    .select()
    .from(parents)
    .where(eq(parents.email, user.email.toLowerCase()))
    .limit(1);

  return parent ? user : null;
}

async function seedChildren() {
  const db = getDb();
  const existingChildren = await db.select({ id: children.id }).from(children).limit(1);
  if (existingChildren.length) return;

  await db.insert(children).values([
    {
      id: crypto.randomUUID(),
      name: "Kai",
      accent: "gold",
      sortOrder: 0,
    },
    {
      id: crypto.randomUUID(),
      name: "Orion",
      accent: "blue",
      sortOrder: 1,
    },
  ]);
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = getDb();
  const childRows = await db.select().from(children).orderBy(asc(children.sortOrder));
  const ids = childRows.map((child) => child.id);
  const [entryRows, settingRows, parentRows] = await Promise.all([
    ids.length
      ? db
          .select()
          .from(ledgerEntries)
          .where(inArray(ledgerEntries.childId, ids))
          .orderBy(desc(ledgerEntries.effectiveAt), desc(ledgerEntries.createdAt))
      : Promise.resolve([]),
    ids.length
      ? db
          .select()
          .from(interestSettings)
          .where(inArray(interestSettings.childId, ids))
      : Promise.resolve([]),
    db.select().from(parents).orderBy(asc(parents.createdAt)),
  ]);

  const names = new Map(childRows.map((child) => [child.id, child.name]));
  const entries = entryRows.map((entry) => ({
    id: entry.id,
    childId: entry.childId,
    childName: names.get(entry.childId) ?? "Unknown",
    amountCents: entry.amountCents,
    comment: entry.comment,
    effectiveAt: entry.effectiveAt,
    createdByEmail: entry.createdByEmail,
  }));
  const settings = new Map(settingRows.map((setting) => [setting.childId, setting]));

  return {
    children: childRows.map((child) => {
      const childEntries = entries.filter((entry) => entry.childId === child.id);
      const setting = settings.get(child.id);
      return {
        id: child.id,
        name: child.name,
        accent: child.accent,
        balanceCents: childEntries.reduce((sum, entry) => sum + entry.amountCents, 0),
        annualRateBps: setting?.annualRateBps ?? 0,
        paymentSchedule: (setting?.paymentSchedule ?? "monthly") as PaymentSchedule,
        entries: childEntries,
      };
    }),
    parents: parentRows.map((parent) => ({
      id: parent.id,
      email: parent.email,
      displayName: parent.displayName,
    })),
    recentEntries: entries.slice(0, 12),
  };
}

export async function childExists(id: string) {
  const db = getDb();
  const [child] = await db
    .select({ id: children.id })
    .from(children)
    .where(eq(children.id, id))
    .limit(1);
  return Boolean(child);
}
