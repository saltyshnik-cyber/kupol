import { createHmac, timingSafeEqual } from "node:crypto";

export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string };

/** Проверяет подпись initData от Telegram Mini App. Возвращает пользователя или null. */
export function verifyInitData(initData: string | null | undefined, maxAgeSec = 60 * 60 * 24): TgUser | null {
  const token = process.env.BOT_TOKEN;
  if (!initData || !token) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const calc = createHmac("sha256", secret).update(dataCheck).digest("hex");
  const a = Buffer.from(calc, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;
  try {
    const user = JSON.parse(params.get("user") || "null");
    return user?.id ? (user as TgUser) : null;
  } catch {
    return null;
  }
}

export function userFromRequest(req: Request): TgUser | null {
  return verifyInitData(req.headers.get("x-telegram-init-data"));
}
