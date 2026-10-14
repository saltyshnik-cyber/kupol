// Локальная проверка сценариев бота без Telegram и без внешней БД (PGlite в памяти).
// Запуск: npm run smoke
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

process.env.BOT_TOKEN = "123:TEST";
process.env.ADMIN_IDS = "1";
process.env.ADMIN_CHAT_ID = "1";
process.env.SITE_URL = "https://example.vercel.app";

const { __setSqlForTests, sql } = await import("../lib/db");
const { getBot } = await import("../lib/bot");
const { api } = await import("../lib/notify");

const pg = new PGlite();
await pg.exec(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
__setSqlForTests((strings: TemplateStringsArray, ...values: any[]) => {
  const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
  return pg.query(text, values).then((r) => r.rows);
});

const sent: { method: string; payload: any }[] = [];
const intercept = async (_prev: any, method: string, payload: any) => {
  sent.push({ method, payload });
  return { ok: true, result: method === "getMe" ? { id: 99, is_bot: true, first_name: "t", username: "kupol_test_bot" } : { message_id: sent.length, date: 0, chat: { id: 1 } } } as any;
};
const bot = getBot();
bot.api.config.use(intercept as any);
api().config.use(intercept as any);
await bot.init();

let uid = 1000;
let mid = 1;
const from = (id: number) => ({ id, is_bot: false, first_name: "Анна", username: "anna" });
const msg = (id: number, extra: any) => ({ update_id: mid++, message: { message_id: mid++, date: 0, chat: { id, type: "private" }, from: from(id), ...extra } });
const text = (id: number, t: string) => msg(id, { text: t, ...(t.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: t.split(" ")[0].length }] } : {}) });
const cb = (id: number, data: string, message_id = 5) => ({ update_id: mid++, callback_query: { id: String(mid), from: from(id), chat_instance: "x", data, message: { message_id, date: 0, chat: { id, type: "private" } } } });
const last = (m: string) => [...sent].reverse().find((s) => s.method === m);
const sentText = () => sent.filter((s) => s.method === "sendMessage").map((s) => s.payload.text).join("\n---\n");

const U = 2000;
// 1. /start без согласия
await bot.handleUpdate(text(U, "/start") as any);
assert.match(last("sendMessage")!.payload.text, /персональных данных/);
// 2. согласие -> меню
await bot.handleUpdate(cb(U, "consent") as any);
assert.match(last("sendMessage")!.payload.text, /Что вас интересует/);
// 3. квиз
await bot.handleUpdate(cb(U, "quiz") as any);
await bot.handleUpdate(cb(U, "q:doctor") as any);
assert.match(last("sendMessage")!.payload.text, /инъекционным/);
await bot.handleUpdate(cb(U, "c:doctor-cosmetology") as any);
assert.match(last("sendMessage")!.payload.text, /45 000/);
// 4. заявка: просит телефон, потом создаёт лид и шлёт админу
await bot.handleUpdate(cb(U, "lead:doctor-cosmetology") as any);
assert.match(last("sendMessage")!.payload.text, /номер телефона/);
await bot.handleUpdate(text(U, "8 905 111 22 33") as any);
const leads = (await sql()`SELECT * FROM leads`) as any[];
assert.equal(leads.length, 1);
assert.ok(sent.some((s) => s.method === "sendMessage" && s.payload.chat_id === 1 && /Заявка на обучение/.test(s.payload.text)));
const u1 = (await sql()`SELECT phone FROM users WHERE tg_id = ${U}`) as any[];
assert.equal(u1[0].phone, "+79051112233");
// 5. анкета модели
await bot.handleUpdate(cb(U, "model:start") as any);
await bot.handleUpdate(text(U, "Анна Иванова") as any);
await bot.handleUpdate(text(U, "+7 902 000 11 22") as any);
await bot.handleUpdate(cb(U, "mz:face") as any);
await bot.handleUpdate(msg(U, { photo: [{ file_id: "small", width: 1, height: 1 }, { file_id: "BIG", width: 9, height: 9 }] }) as any);
const apps = (await sql()`SELECT * FROM model_applications`) as any[];
assert.equal(apps.length, 1);
assert.equal(apps[0].photo_file_id, "BIG");
assert.ok(sent.some((s) => s.method === "sendPhoto" && /анкета модели/.test(s.payload.caption)));
// 6. диплом + одобрение админом
await bot.handleUpdate(cb(U, "diploma:start") as any);
await bot.handleUpdate(msg(U, { photo: [{ file_id: "DIP", width: 9, height: 9 }] }) as any);
const dp = (await sql()`SELECT * FROM diplomas`) as any[];
assert.equal(dp.length, 1);
assert.equal(dp[0].status, "pending");
// не-админ не может одобрить
await bot.handleUpdate(cb(U, `dp:ok:${dp[0].id}`) as any);
assert.equal(((await sql()`SELECT status FROM diplomas`) as any[])[0].status, "pending");
// админ (id=1) одобряет
await bot.handleUpdate({ update_id: mid++, callback_query: { id: "a", from: from(1), chat_instance: "x", data: `dp:ok:${dp[0].id}`, message: { message_id: 7, date: 0, chat: { id: 1, type: "private" } } } } as any);
assert.equal(((await sql()`SELECT is_verified FROM users WHERE tg_id = ${U}`) as any[])[0].is_verified, true);
assert.ok(sent.some((s) => s.method === "sendMessage" && s.payload.chat_id === U && /Диплом подтверждён/.test(s.payload.text)));
// 7. deep-link payload после согласия
await bot.handleUpdate(text(U + 1, "/start model") as any);
await bot.handleUpdate(cb(U + 1, "consent") as any);
assert.match(last("sendMessage")!.payload.text, /Анкета модели/);

// 8. Mini App API: подпись initData и закрытый каталог
const { createHmac } = await import("node:crypto");
const makeInit = (id: number, token = process.env.BOT_TOKEN!) => {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id, first_name: "Анна" }) });
  const dc = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  p.set("hash", createHmac("sha256", secret).update(dc).digest("hex"));
  return p.toString();
};
const { GET: catalog } = await import("../app/api/catalog/route");
const { GET: meGet } = await import("../app/api/me/route");
const { POST: leadPost } = await import("../app/api/lead/route");
const req = (init?: string, body?: any) => new Request("http://x/api", { method: body ? "POST" : "GET", headers: init ? { "x-telegram-init-data": init } : {}, body: body ? JSON.stringify(body) : undefined });
const anon = await (await catalog(req())).json();
assert.equal(anon.verified, false);
assert.ok(anon.products.every((p: any) => !p.restricted) && anon.lockedCount > 0);
const forged = await (await catalog(req(makeInit(U, "999:WRONG")))).json();
assert.equal(forged.authorized, false);
const unverified = await (await catalog(req(makeInit(U + 1)))).json();
assert.equal(unverified.verified, false);
const verified = await (await catalog(req(makeInit(U)))).json();
assert.equal(verified.verified, true);
assert.ok(verified.products.some((p: any) => p.restricted));
assert.equal((await meGet(req("bad"))).status, 401);
const me = await (await meGet(req(makeInit(U)))).json();
assert.equal(me.verified, true);
assert.equal(me.leads.length, 1);
assert.equal((await leadPost(req(makeInit(U), { courseId: "nope" }))).status, 400);
assert.equal((await leadPost(req(makeInit(U), { courseId: "enerpeel" }))).status, 200);
const noConsent = await leadPost(req(makeInit(777), { courseId: "enerpeel" }));
assert.equal(noConsent.status, 403);

// 9. /api/setup: секрет, таблицы, webhook
process.env.WEBHOOK_SECRET = "s3cret_value";
const { GET: setup } = await import("../app/api/setup/route");
assert.equal((await setup(new Request("http://x/api/setup?key=wrong"))).status, 403);
const before = sent.length;
const sres = await setup(new Request("http://x/api/setup?key=s3cret_value"));
const sbody = await sres.json();
assert.equal(sres.status, 200, JSON.stringify(sbody));
assert.ok(sent.slice(before).some((s) => s.method === "setWebhook" && s.payload.url === "https://example.vercel.app/api/bot" && s.payload.secret_token === "s3cret_value"));
assert.ok(sent.slice(before).some((s) => s.method === "setChatMenuButton"));

console.log("OK: все сценарии бота прошли (" + sent.length + " вызовов Telegram API)");
process.exit(0);
