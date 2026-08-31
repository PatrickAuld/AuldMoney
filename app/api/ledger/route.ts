import { z } from "zod";
import { getDb } from "@/db";
import { ledgerEntries } from "@/db/schema";
import { childExists, requireParent } from "@/app/lib/data";

const schema = z.object({
  childId: z.string().min(1),
  amountCents: z.number().int().min(-100_000_000).max(100_000_000).refine(Boolean),
  comment: z.string().trim().max(280).default(""),
});

export async function POST(request: Request) {
  const user = await requireParent();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid amount and note." }, { status: 400 });
  }
  if (!(await childExists(parsed.data.childId))) {
    return Response.json({ error: "Child not found." }, { status: 404 });
  }

  const [entry] = await getDb()
    .insert(ledgerEntries)
    .values({
      id: crypto.randomUUID(),
      childId: parsed.data.childId,
      amountCents: parsed.data.amountCents,
      comment: parsed.data.comment,
      effectiveAt: new Date().toISOString(),
      createdByEmail: user.email.toLowerCase(),
    })
    .returning();

  return Response.json({ entry }, { status: 201 });
}
