import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { sql, upsertUser, setStep, mergeDraft, type DbUser } from "./db";
import { CONFIG } from "./config";
import { courses, courseById, coursesFor, type Audience } from "./content";
import { createLead } from "./leads";
import { esc, isAdmin, notifyAdmin, siteUrl, userLink, api } from "./notify";

let _bot: Bot | null = null;
export function getBot(): Bot {
  if (_bot) return _bot;
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN не задан");
  _bot = buildBot(new Bot(token));
  return _bot;
}

const phoneRe = /\d/g;
function normalizePhone(raw: string): string | null {
  const digits = (raw.match(phoneRe) || []).join("");
  if (digits.length < 10 || digits.length > 12) return null;
  return raw.trim().startsWith("+") ? `+${digits}` : digits.length === 11 && digits[0] === "8" ? `+7${digits.slice(1)}` : digits.length === 10 ? `+7${digits}` : `+${digits}`;
}

const PRIVACY_NOTE = () => {
  const s = siteUrl();
  return s ? `\n\n<a href="${s}/privacy">Политика обработки персональных данных</a>` : "";
};

function mainMenu(user?: Pick<DbUser, "is_verified">) {
  const kb = new InlineKeyboard();
  const site = siteUrl();
  if (site) kb.webApp("📱 Открыть приложение «Купол»", site).row();
  kb.text("🎓 Подобрать обучение", "quiz").row();
  if (site) kb.webApp("🛍 Каталог препаратов и косметики", `${site}/?tab=catalog`).row();
  kb.text("💆 Стать моделью", "model:start").text("📄 Загрузить диплом", "diploma:start").row();
  kb.text("📞 Контакты", "contacts");
  return kb;
}

async function showMenu(ctx: Context, user?: DbUser) {
  const verified = user?.is_verified ? "\n\n✅ Вы подтверждены как специалист: инъекционные препараты в каталоге доступны." : "";
  await ctx.reply(
    `<b>Купол</b>: ваш поставщик красоты с 2006 года.\nКраевой учебный центр косметологии и массажа, препараты для эстетической медицины, профессиональная и домашняя косметика.${verified}\n\nЧто вас интересует?`,
    { parse_mode: "HTML", reply_markup: mainMenu(user) },
  );
}

function contactsText() {
  const phones = CONFIG.phones.map((p) => `• ${p.label}: ${p.value}`).join("\n");
  return [
    "<b>Контакты «Купол»</b>",
    `📍 ${esc(CONFIG.address)}`,
    `🕒 ${esc(CONFIG.hours)}`,
    "",
    phones,
    "",
    `Запись на обучение: @${CONFIG.telegram.study}`,
    `Заказ препаратов и косметики: @${CONFIG.telegram.orders}`,
    `Канал: https://t.me/${CONFIG.telegram.channel}`,
    `Чат моделей: https://t.me/${CONFIG.telegram.models}`,
    `Сайт: ${CONFIG.site}`,
    "",
    `💳 ${esc(CONFIG.payment)}`,
    `🚚 ${esc(CONFIG.delivery)}`,
  ].join("\n");
}

function courseCard(id: string) {
  const c = courseById(id)!;
  const lines = [
    `<b>${esc(c.title)}</b>`,
    `<i>${esc(c.kind)} · ${esc(c.audienceLabel)}</i>`,
    "",
    esc(c.summary),
    "",
    `💰 <b>${esc(c.price)}</b>${c.priceNote ? `\n${esc(c.priceNote)}` : ""}`,
    `⏱ ${esc(c.duration)}`,
    `📅 ${esc(c.nextStart)}`,
  ];
  if (c.program.length) lines.push("", "<b>Программа:</b>", ...c.program.map((p) => `• ${esc(p)}`));
  if (c.teachers.length) lines.push("", `<b>Преподаватели:</b> ${esc(c.teachers.join(", "))}`);
  if (c.document) lines.push("", `🪪 ${esc(c.document)}`);
  return lines.join("\n");
}

function buildBot(bot: Bot): Bot {
  // ---------- вспомогательные ----------
  const requireConsent = async (ctx: Context, user: DbUser): Promise<boolean> => {
    if (user.consent_at) return true;
    await askConsent(ctx);
    return false;
  };

  const askConsent = async (ctx: Context, next?: string) => {
    if (next && ctx.from) await mergeDraft(ctx.from.id, { next });
    await ctx.reply(
      "Здравствуйте! 👋 Это бот учебного центра и поставщика «Купол».\n\nЧтобы записать вас на обучение, на процедуры или проверить диплом, нам нужно обработать ваши персональные данные (имя, телефон, фото). Нажимая «Согласен», вы даёте на это согласие." + PRIVACY_NOTE(),
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("✅ Согласен", "consent") },
    );
  };

  const startModel = async (ctx: Context, user: DbUser) => {
    await setStep(user.tg_id, "model_name", {});
    await ctx.reply(
      "💆 <b>Анкета модели</b>\n\nНа наших процедурах студенты и врачи отрабатывают навыки под контролем преподавателей. Цены для моделей ниже салонных: оплачивается препарат.\n\nКак вас зовут? Напишите ФИО.",
      { parse_mode: "HTML", reply_markup: { remove_keyboard: true } },
    );
  };

  const startDiploma = async (ctx: Context, user: DbUser) => {
    if (user.is_verified) {
      await ctx.reply("✅ Ваш диплом уже подтверждён, инъекционные препараты в каталоге доступны.");
      return;
    }
    await setStep(user.tg_id, "diploma", {});
    await ctx.reply(
      "📄 Пришлите фото или скан диплома о медицинском образовании (одним сообщением, можно PDF).\n\nАдминистратор проверит документ и откроет вам закрытый раздел каталога. Это обычно занимает до рабочего дня.",
    );
  };

  const askPhone = async (ctx: Context, step: string) => {
    await ctx.reply("Оставьте номер телефона для связи: нажмите кнопку или напишите вручную.", {
      reply_markup: new Keyboard().requestContact("📱 Поделиться номером").resized().oneTime(),
    });
  };

  const startLead = async (ctx: Context, user: DbUser, courseId: string) => {
    if (!(await requireConsent(ctx, user))) {
      await mergeDraft(user.tg_id, { next: `lead:${courseId}` });
      return;
    }
    if (!user.phone) {
      await setStep(user.tg_id, "lead_phone", { courseId });
      await askPhone(ctx, "lead_phone");
      return;
    }
    await createLead(user, courseId);
    await ctx.reply(`✅ Заявка на курс «${courseById(courseId)?.title}» отправлена. Менеджер свяжется с вами в рабочее время (${CONFIG.hours}).`, { reply_markup: new InlineKeyboard().text("⬅️ В меню", "menu") });
  };

  const finishModel = async (ctx: Context, user: DbUser, photoId: string) => {
    const d = user.draft as { name: string; phone: string; zone: string };
    await sql()`INSERT INTO model_applications (tg_id, full_name, phone, zone, photo_file_id)
                VALUES (${user.tg_id}, ${d.name}, ${d.phone}, ${d.zone}, ${photoId})`;
    await setStep(user.tg_id, null, {});
    const chat = Number(process.env.ADMIN_CHAT_ID || (process.env.ADMIN_IDS || "").split(",")[0] || 0);
    if (chat) {
      try {
        await api().sendPhoto(chat, photoId, {
          parse_mode: "HTML",
          caption: `💆 <b>Новая анкета модели</b>\n${esc(d.name)}\nТел.: ${esc(d.phone)}\nЗона: ${esc(d.zone)}\n${userLink(user)}`,
        });
      } catch (e) {
        console.error("model photo notify failed", e);
      }
    }
    await ctx.reply("✅ Анкета принята! Менеджер свяжется с вами и предложит ближайшие даты процедур. Расписание также в приложении, вкладка «Модель».", {
      reply_markup: new InlineKeyboard().text("⬅️ В меню", "menu"),
    });
  };

  const afterConsent = async (ctx: Context, user: DbUser) => {
    const next = (user.draft as any)?.next as string | undefined;
    await mergeDraft(user.tg_id, { next: null });
    if (next === "model") return startModel(ctx, user);
    if (next === "diploma") return startDiploma(ctx, user);
    if (next === "learn") return quizStart(ctx);
    if (next?.startsWith("lead:")) return startLead(ctx, user, next.slice(5));
    return showMenu(ctx, user);
  };

  const quizStart = async (ctx: Context) => {
    await ctx.reply("🎓 <b>Подберём обучение</b>\n\nКакое у вас образование?", {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("Высшее медицинское", "q:doctor").row()
        .text("Среднее медицинское", "q:nurse").row()
        .text("Нет медицинского образования", "q:none").row()
        .text("⬅️ В меню", "menu"),
    });
  };

  // ---------- команды ----------
  bot.command("whoami", (ctx) => ctx.reply(`Ваш Telegram ID: ${ctx.from?.id}\nЧат: ${ctx.chat.id}`));

  bot.command("start", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const user = await upsertUser(ctx.from!);
    const payload = String(ctx.match || "").trim();
    const nextMap: Record<string, string> = { model: "model", diploma: "diploma", learn: "learn" };
    const next = nextMap[payload];
    if (!user.consent_at) return askConsent(ctx, next);
    if (next) {
      await mergeDraft(user.tg_id, { next });
      return afterConsent(ctx, (await upsertUser(ctx.from!)));
    }
    await setStep(user.tg_id, null);
    return showMenu(ctx, user);
  });

  bot.command("contacts", (ctx) => ctx.reply(contactsText(), { parse_mode: "HTML", link_preview_options: { is_disabled: true } }));

  // команды админа
  bot.command("stats", async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const [u, v, p, l, m] = await Promise.all([
      sql()`SELECT count(*)::int AS n FROM users`,
      sql()`SELECT count(*)::int AS n FROM users WHERE is_verified`,
      sql()`SELECT count(*)::int AS n FROM diplomas WHERE status = 'pending'`,
      sql()`SELECT count(*)::int AS n FROM leads`,
      sql()`SELECT count(*)::int AS n FROM model_applications`,
    ]);
    await ctx.reply(
      `Пользователей: ${(u as any)[0].n}\nВерифицировано: ${(v as any)[0].n}\nДипломов на проверке: ${(p as any)[0].n}\nЗаявок на обучение: ${(l as any)[0].n}\nАнкет моделей: ${(m as any)[0].n}`,
    );
  });

  bot.command(["verify", "unverify"], async (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const id = Number(String(ctx.match).trim());
    if (!id) return ctx.reply("Формат: /verify 123456789 или /unverify 123456789");
    const on = ctx.msg.text.startsWith("/verify");
    const r = (await sql()`UPDATE users SET is_verified = ${on} WHERE tg_id = ${id} RETURNING tg_id`) as any[];
    await ctx.reply(r.length ? (on ? "✅ Верифицирован" : "Верификация снята") : "Пользователь не найден (он должен хотя бы раз написать боту).");
  });

  // ---------- кнопки ----------
  bot.callbackQuery("consent", async (ctx) => {
    const user = await upsertUser(ctx.from);
    await sql()`UPDATE users SET consent_at = now() WHERE tg_id = ${user.tg_id}`;
    await ctx.answerCallbackQuery({ text: "Спасибо!" });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await afterConsent(ctx, await upsertUser(ctx.from));
  });

  bot.callbackQuery("menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await upsertUser(ctx.from);
    await setStep(user.tg_id, null);
    await showMenu(ctx, user);
  });

  bot.callbackQuery("contacts", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(contactsText(), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: new InlineKeyboard().text("⬅️ В меню", "menu"),
    });
  });

  bot.callbackQuery("quiz", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await upsertUser(ctx.from);
    if (!(await requireConsent(ctx, user))) return mergeDraft(user.tg_id, { next: "learn" });
    await quizStart(ctx);
  });

  bot.callbackQuery(/^q:(doctor|nurse|none)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const a = ctx.match[1] as Audience;
    const list = coursesFor(a);
    const kb = new InlineKeyboard();
    for (const c of list) kb.text(`${c.title} · ${c.price}`, `c:${c.id}`).row();
    kb.text("⬅️ Назад", "quiz");
    const head =
      a === "doctor"
        ? "Для врачей доступны курсы и семинары по инъекционным методикам:"
        : a === "nurse"
          ? "Вам подойдут курсы для среднего медперсонала, пилинги и массаж:"
          : "Без медицинского образования можно освоить эстетику лица и массаж:";
    await ctx.reply(`${head}\n\nВыберите курс, чтобы увидеть подробности.`, { reply_markup: kb });
  });

  bot.callbackQuery(/^c:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = ctx.match[1];
    if (!courseById(id)) return;
    await ctx.reply(courseCard(id), {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("✍️ Записаться", `lead:${id}`).row()
        .text("⬅️ К списку", "quiz"),
    });
  });

  bot.callbackQuery(/^lead:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await upsertUser(ctx.from);
    await startLead(ctx, user, ctx.match[1]);
  });

  bot.callbackQuery("model:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await upsertUser(ctx.from);
    if (!(await requireConsent(ctx, user))) return mergeDraft(user.tg_id, { next: "model" });
    await startModel(ctx, user);
  });

  bot.callbackQuery(/^mz:(face|body|massage|any)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const zones: Record<string, string> = { face: "лицо", body: "тело", massage: "массаж", any: "любая процедура" };
    const user = await upsertUser(ctx.from);
    if (user.step !== "model_zone") return;
    await setStep(user.tg_id, "model_photo", { ...user.draft, zone: zones[ctx.match[1]] });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.reply("📸 Последний шаг: пришлите фото лица без макияжа при хорошем освещении (анфас, обычным фото, не файлом).");
  });

  bot.callbackQuery("diploma:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = await upsertUser(ctx.from);
    if (!(await requireConsent(ctx, user))) return mergeDraft(user.tg_id, { next: "diploma" });
    await startDiploma(ctx, user);
  });

  // решение админа по диплому
  bot.callbackQuery(/^dp:(ok|no):(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: "Нет доступа", show_alert: true });
    const ok = ctx.match[1] === "ok";
    const id = Number(ctx.match[2]);
    const rows = (await sql()`
      UPDATE diplomas SET status = ${ok ? "approved" : "rejected"}, reviewed_by = ${ctx.from.id}, reviewed_at = now()
      WHERE id = ${id} AND status = 'pending' RETURNING tg_id`) as { tg_id: number }[];
    if (!rows.length) return ctx.answerCallbackQuery({ text: "Уже обработано" });
    const tgId = Number(rows[0].tg_id);
    if (ok) await sql()`UPDATE users SET is_verified = TRUE WHERE tg_id = ${tgId}`;
    await ctx.answerCallbackQuery({ text: ok ? "Одобрено" : "Отклонено" });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.reply(`${ok ? "✅ Одобрено" : "❌ Отклонено"} (диплом #${id}, ${ctx.from.first_name})`, {
      reply_parameters: { message_id: ctx.callbackQuery.message!.message_id },
    });
    try {
      await api().sendMessage(
        tgId,
        ok
          ? "✅ Диплом подтверждён! Закрытый раздел каталога (инъекционные препараты, ботулотоксины, мезотерапия) теперь доступен в приложении."
          : "❌ Не удалось подтвердить диплом. Пришлите, пожалуйста, более чёткое фото или скан всех страниц, либо позвоните нам: +7 (905) 976-01-23.",
      );
    } catch (e) {
      console.error("notify user failed", e);
    }
  });

  // ---------- сообщения по шагам ----------
  bot.on("message:contact", async (ctx) => {
    const user = await upsertUser(ctx.from);
    const phone = normalizePhone(ctx.message.contact.phone_number);
    if (!phone) return;
    await handlePhone(ctx, user, phone);
  });

  const handlePhone = async (ctx: Context, user: DbUser, phone: string) => {
    if (user.step === "model_phone") {
      await setStep(user.tg_id, "model_zone", { ...user.draft, phone });
      await ctx.reply("Принято ✅", { reply_markup: { remove_keyboard: true } });
      await ctx.reply("Какая процедура интересует?", {
        reply_markup: new InlineKeyboard()
          .text("Лицо", "mz:face").text("Тело", "mz:body").row()
          .text("Массаж", "mz:massage").text("Любая", "mz:any"),
      });
    } else if (user.step === "lead_phone") {
      await sql()`UPDATE users SET phone = ${phone} WHERE tg_id = ${user.tg_id}`;
      const courseId = (user.draft as any).courseId as string;
      await setStep(user.tg_id, null, {});
      await ctx.reply("Спасибо!", { reply_markup: { remove_keyboard: true } });
      await startLead(ctx, { ...user, phone, step: null }, courseId);
    }
  };

  bot.on("message:text", async (ctx, next) => {
    if (ctx.chat.type !== "private" || ctx.message.text.startsWith("/")) return next();
    const user = await upsertUser(ctx.from);
    switch (user.step) {
      case "model_name": {
        const name = ctx.message.text.trim().slice(0, 120);
        if (name.length < 3) return ctx.reply("Напишите, пожалуйста, имя и фамилию.");
        await setStep(user.tg_id, "model_phone", { name });
        return askPhone(ctx, "model_phone");
      }
      case "model_phone":
      case "lead_phone": {
        const phone = normalizePhone(ctx.message.text);
        if (!phone) return ctx.reply("Не получилось распознать номер. Пример: +7 905 976 01 23");
        return handlePhone(ctx, user, phone);
      }
      case "model_photo":
        return ctx.reply("Нужно именно фото лица. Пришлите его одним снимком.");
      case "diploma":
        return ctx.reply("Пришлите, пожалуйста, фото или скан диплома.");
      default:
        return ctx.reply("Выберите, что вас интересует:", { reply_markup: mainMenu(user) });
    }
  });

  bot.on("message:photo", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const user = await upsertUser(ctx.from);
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    if (user.step === "model_photo") return finishModel(ctx, user, fileId);
    if (user.step === "diploma") return saveDiploma(ctx, user, fileId, "photo");
    return showMenu(ctx, user);
  });

  bot.on("message:document", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const user = await upsertUser(ctx.from);
    if (user.step === "diploma") return saveDiploma(ctx, user, ctx.message.document.file_id, "document");
    if (user.step === "model_photo") return ctx.reply("Пришлите фото обычным снимком, а не файлом.");
    return showMenu(ctx, user);
  });

  const saveDiploma = async (ctx: Context, user: DbUser, fileId: string, type: "photo" | "document") => {
    const rows = (await sql()`
      INSERT INTO diplomas (tg_id, file_id, file_type) VALUES (${user.tg_id}, ${fileId}, ${type}) RETURNING id`) as { id: number }[];
    const id = rows[0].id;
    await setStep(user.tg_id, null, {});
    const chat = Number(process.env.ADMIN_CHAT_ID || (process.env.ADMIN_IDS || "").split(",")[0] || 0);
    if (chat) {
      const opts = {
        parse_mode: "HTML" as const,
        caption: `📄 <b>Диплом на проверку #${id}</b>\n${userLink(user)}${user.phone ? `\nТел.: ${esc(user.phone)}` : ""}`,
        reply_markup: new InlineKeyboard().text("✅ Одобрить", `dp:ok:${id}`).text("❌ Отклонить", `dp:no:${id}`),
      };
      try {
        if (type === "photo") await api().sendPhoto(chat, fileId, opts);
        else await api().sendDocument(chat, fileId, opts);
      } catch (e) {
        console.error("diploma notify failed", e);
        await notifyAdmin(`📄 Диплом #${id} от ${userLink(user)}: не удалось переслать файл, проверьте базу.`);
      }
    }
    await ctx.reply("✅ Документ отправлен на проверку. Мы напишем вам, как только он будет подтверждён.", {
      reply_markup: new InlineKeyboard().text("⬅️ В меню", "menu"),
    });
  };

  bot.catch((err) => console.error("bot error", err.error));
  return bot;
}
