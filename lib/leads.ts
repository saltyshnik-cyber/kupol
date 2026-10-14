import { sql, type DbUser } from "./db";
import { courseById } from "./content";
import { esc, notifyAdmin, userLink } from "./notify";

/** Создаёт заявку на курс и уведомляет администратора. */
export async function createLead(user: DbUser, courseId: string) {
  const course = courseById(courseId);
  if (!course) throw new Error("unknown course");
  const rows = (await sql()`
    INSERT INTO leads (tg_id, course_id) VALUES (${user.tg_id}, ${courseId}) RETURNING id`) as { id: number }[];
  await notifyAdmin(
    [
      `🎓 <b>Заявка на обучение #${rows[0].id}</b>`,
      `Курс: <b>${esc(course.title)}</b> (${esc(course.price)})`,
      `От: ${userLink(user)}`,
      user.phone ? `Телефон: ${esc(user.phone)}` : "Телефон: не указан",
    ].join("\n"),
  );
  return rows[0].id;
}
