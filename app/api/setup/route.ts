import { readFileSync } from "node:fs";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { api, siteUrl } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Одноразовая настройка из браузера (без командной строки):
 *   https://<сайт>/api/setup?key=<WEBHOOK_SECRET>
 * Создаёт таблицы, подключает webhook бота и кнопку меню. Безопасно запускать повторно.
 */
export async function GET(req: Request) {
  const secret = process.env.WEBHOOK_SECRET || "";
  const key = new URL(req.url).searchParams.get("key") || "";
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const steps: Record<string, string> = {};
  const missing = ["BOT_TOKEN", "DATABASE_URL", "ADMIN_IDS", "NEXT_PUBLIC_BOT_USERNAME"].filter((k) => !process.env[k]);
  if (missing.length) steps.warning = `Не заданы переменные: ${missing.join(", ")}`;

  try {
    const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
    for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
      await (sql() as any).query?.(stmt) ?? (await (sql() as any)(Object.assign([stmt], { raw: [stmt] })));
    }
    steps.database = "ok: таблицы созданы";
  } catch (e: any) {
    steps.database = `ошибка: ${e?.message ?? e}`;
  }

  try {
    const site = siteUrl() || new URL(req.url).origin;
    const bot = api();
    await bot.setWebhook(`${site}/api/bot`, {
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    await bot.setChatMenuButton({ menu_button: { type: "web_app", text: "Купол", web_app: { url: site } } });
    await bot.setMyCommands([
      { command: "start", description: "Главное меню" },
      { command: "contacts", description: "Контакты" },
    ]);
    steps.telegram = `ok: webhook ${site}/api/bot`;
  } catch (e: any) {
    steps.telegram = `ошибка: ${e?.message ?? e}`;
  }

  const ok = steps.database.startsWith("ok") && steps.telegram.startsWith("ok");
  return new NextResponse(JSON.stringify({ ok, ...steps }, null, 1), { status: ok ? 200 : 500, headers: { "content-type": "application/json; charset=utf-8" } });
}
