import { getDashboardData, requireParent } from "@/app/lib/data";

export async function GET() {
  const user = await requireParent();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });
  return Response.json(await getDashboardData());
}
