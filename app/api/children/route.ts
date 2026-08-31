import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { children } from "@/db/schema";
import { requireParent } from "@/app/lib/data";

const schema = z.object({ name: z.string().trim().min(1).max(50) });

export async function POST(request: Request) {
  const user = await requireParent();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Enter a name." }, { status: 400 });
  }

  const [next] = await getDb()
    .select({ value: sql<number>`coalesce(max(${children.sortOrder}), -1) + 1` })
    .from(children);
  const accents = ["gold", "blue", "green", "rose"];
  const [child] = await getDb()
    .insert(children)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      sortOrder: Number(next?.value ?? 0),
      accent: accents[Number(next?.value ?? 0) % accents.length],
    })
    .returning();

  return Response.json({ child }, { status: 201 });
}
