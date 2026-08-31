import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { parents } from "@/db/schema";
import { requireParent } from "@/app/lib/data";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(request: Request) {
  const user = await requireParent();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  await getDb()
    .insert(parents)
    .values({
      id: crypto.randomUUID(),
      email: parsed.data.email,
      addedByEmail: user.email.toLowerCase(),
    })
    .onConflictDoNothing();

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await requireParent();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (parsed.data.email === user.email.toLowerCase()) {
    return Response.json({ error: "You cannot remove your own access." }, { status: 400 });
  }

  await getDb().delete(parents).where(eq(parents.email, parsed.data.email));
  return Response.json({ ok: true });
}
