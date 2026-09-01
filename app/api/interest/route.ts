import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { interestSettings } from "@/db/schema";
import { childExists, requireParent } from "@/app/lib/data";

const schema = z.object({
  childId: z.string().min(1),
  annualRateBps: z.number().int().min(0).max(10_000),
  paymentSchedule: z.enum(["weekly", "monthly", "quarterly", "annually"]),
});

export async function PUT(request: Request) {
  const user = await requireParent();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Enter a rate from 0% to 100%." }, { status: 400 });
  }
  if (!(await childExists(parsed.data.childId))) {
    return Response.json({ error: "Child not found." }, { status: 404 });
  }

  await getDb()
    .insert(interestSettings)
    .values({
      id: crypto.randomUUID(),
      childId: parsed.data.childId,
      annualRateBps: parsed.data.annualRateBps,
      paymentSchedule: parsed.data.paymentSchedule,
      lastAppliedAt: sql`CURRENT_TIMESTAMP`,
      updatedByEmail: user.email.toLowerCase(),
    })
    .onConflictDoUpdate({
      target: interestSettings.childId,
      set: {
        annualRateBps: parsed.data.annualRateBps,
        paymentSchedule: parsed.data.paymentSchedule,
        lastAppliedAt: sql`CASE
          WHEN ${interestSettings.annualRateBps} != ${parsed.data.annualRateBps}
            OR ${interestSettings.paymentSchedule} != ${parsed.data.paymentSchedule}
          THEN CURRENT_TIMESTAMP
          ELSE ${interestSettings.lastAppliedAt}
        END`,
        updatedByEmail: user.email.toLowerCase(),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  return Response.json({ ok: true });
}
