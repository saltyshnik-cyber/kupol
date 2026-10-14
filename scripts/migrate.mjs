// Создаёт таблицы. Запуск: npm run db:migrate  (нужен DATABASE_URL в .env.local)
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("Нет DATABASE_URL. Добавьте его в .env.local (vercel env pull .env.local)");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
  await sql.query(stmt);
}
console.log("Готово: таблицы созданы");
