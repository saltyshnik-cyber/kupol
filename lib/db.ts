import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

/** Только для локального теста (scripts/smoke.ts): подмена драйвера на PGlite. */
export function __setSqlForTests(fn: any) {
  _sql = fn;
}

export function sql() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL не задан");
  return (_sql ??= neon(process.env.DATABASE_URL));
}

export type DbUser = {
  tg_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  consent_at: string | null;
  is_verified: boolean;
  step: string | null;
  draft: Record<string, any>;
};

type TgFrom = { id: number; first_name?: string; last_name?: string; username?: string };

export async function upsertUser(from: TgFrom): Promise<DbUser> {
  const rows = (await sql()`
    INSERT INTO users (tg_id, first_name, last_name, username)
    VALUES (${from.id}, ${from.first_name ?? null}, ${from.last_name ?? null}, ${from.username ?? null})
    ON CONFLICT (tg_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      username = EXCLUDED.username
    RETURNING *`) as DbUser[];
  return rows[0];
}

export async function setStep(tgId: number, step: string | null, draft?: Record<string, any>) {
  if (draft) {
    await sql()`UPDATE users SET step = ${step}, draft = ${JSON.stringify(draft)}::jsonb WHERE tg_id = ${tgId}`;
  } else {
    await sql()`UPDATE users SET step = ${step} WHERE tg_id = ${tgId}`;
  }
}

export async function mergeDraft(tgId: number, patch: Record<string, any>) {
  await sql()`UPDATE users SET draft = draft || ${JSON.stringify(patch)}::jsonb WHERE tg_id = ${tgId}`;
}
