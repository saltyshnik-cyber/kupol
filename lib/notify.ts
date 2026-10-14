import { Api } from "grammy";
import type { DbUser } from "./db";

let _api: Api | null = null;
export function api(): Api {
  if (!process.env.BOT_TOKEN) throw new Error("BOT_TOKEN не задан");
  return (_api ??= new Api(process.env.BOT_TOKEN));
}

export const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function adminIds(): number[] {
  return (process.env.ADMIN_IDS || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean);
}
export const isAdmin = (id?: number) => !!id && adminIds().includes(id);

export function adminChatId(): number | null {
  const v = Number(process.env.ADMIN_CHAT_ID || adminIds()[0] || 0);
  return v || null;
}

export function siteUrl(): string | null {
  const u = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return u ? u.replace(/\/$/, "") : null;
}

export function displayName(u: Pick<DbUser, "first_name" | "last_name" | "username" | "tg_id">) {
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return n || (u.username ? `@${u.username}` : String(u.tg_id));
}

/** Кликабельная ссылка на пользователя для админа */
export function userLink(u: Pick<DbUser, "first_name" | "last_name" | "username" | "tg_id">) {
  const label = esc(displayName(u));
  return u.username
    ? `<a href="https://t.me/${u.username}">${label}</a> (@${esc(u.username)})`
    : `<a href="tg://user?id=${u.tg_id}">${label}</a> (id ${u.tg_id})`;
}

export async function notifyAdmin(html: string, extra?: Parameters<Api["sendMessage"]>[2]) {
  const chat = adminChatId();
  if (!chat) {
    console.warn("ADMIN_CHAT_ID/ADMIN_IDS не заданы — уведомление не отправлено:", html);
    return;
  }
  try {
    await api().sendMessage(chat, html, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });
  } catch (e) {
    console.error("notifyAdmin failed", e);
  }
}
