import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/db";
import { userFromRequest } from "@/lib/tg-auth";
import { courseById } from "@/lib/content";
import { createLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const tg = userFromRequest(req);
  if (!tg) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { courseId } = await req.json().catch(() => ({}));
  if (!courseId || !courseById(courseId)) return NextResponse.json({ error: "bad_course" }, { status: 400 });
  try {
    const user = await upsertUser(tg);
    if (!user.consent_at) return NextResponse.json({ error: "consent" }, { status: 403 });
    const id = await createLead(user, courseId);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
