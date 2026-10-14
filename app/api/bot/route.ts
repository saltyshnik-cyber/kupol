import { webhookCallback } from "grammy";
import { getBot } from "@/lib/bot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

let handler: ((req: Request) => Promise<Response>) | null = null;

export async function POST(req: Request) {
  if (!process.env.BOT_TOKEN) return new Response("BOT_TOKEN is not set", { status: 500 });
  handler ??= webhookCallback(getBot(), "std/http", { secretToken: process.env.WEBHOOK_SECRET });
  return handler(req);
}

export async function GET() {
  return new Response("Kupol bot webhook is alive");
}
