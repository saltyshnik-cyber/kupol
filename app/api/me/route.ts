import { NextResponse } from "next/server";
import { sql, upsertUser } from "@/lib/db";
import { userFromRequest } from "@/lib/tg-auth";
import { courseById } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tg = userFromRequest(req);
  if (!tg) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const user = await upsertUser(tg);
    const leads = (await sql()`SELECT course_id, status, created_at FROM leads WHERE tg_id = ${tg.id} ORDER BY id DESC LIMIT 10`) as any[];
    const diploma = (await sql()`SELECT status FROM diplomas WHERE tg_id = ${tg.id} ORDER BY id DESC LIMIT 1`) as any[];
    return NextResponse.json({
      id: tg.id,
      name: [user.first_name, user.last_name].filter(Boolean).join(" "),
      verified: user.is_verified,
      consent: !!user.consent_at,
      diplomaStatus: diploma[0]?.status ?? null,
      leads: leads.map((l) => ({ course: courseById(l.course_id)?.title ?? l.course_id, status: l.status, at: l.created_at })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
}
