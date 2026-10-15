import { CONFIG } from "@/lib/config";

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME || "";

export const tg = () => (typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined);
export const initData = (): string => tg()?.initData || "";

export async function call(path: string, init?: RequestInit) {
  const r = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", "x-telegram-init-data": initData(), ...(init?.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

export function openTg(url: string) {
  const w = tg();
  if (w?.openTelegramLink) w.openTelegramLink(url);
  else window.open(url, "_blank");
}

export function openLink(url: string) {
  const w = tg();
  if (w?.openLink) w.openLink(url);
  else window.open(url, "_blank");
}

export const openBot = (start: string) =>
  BOT ? openTg(`https://t.me/${BOT}?start=${start}`) : openTg(`https://t.me/${CONFIG.telegram.study}`);

export type Me = {
  name: string;
  verified: boolean;
  consent: boolean;
  diplomaStatus: string | null;
  leads: { course: string; status: string; at: string }[];
};
