"use client";

import { useMemo, useState } from "react";
import { CONFIG } from "@/lib/config";
import { courses, teachers, type Audience, type Course } from "@/lib/content";
import { Avatar, Cover, Icon, Sheet, type IconName } from "./ui";
import { call, openBot, openTg } from "./tg";

const VARIANT: Record<Audience, number> = { doctor: 0, nurse: 2, none: 1 };
const GLYPH: Record<Audience, IconName> = { doctor: "drop", nurse: "heart", none: "leaf" };

function variantOf(c: Course) {
  return c.audience.length > 1 ? 3 : VARIANT[c.audience[0]];
}
function glyphOf(c: Course): IconName {
  if (c.id.includes("massage")) return "wave";
  return c.audience.length > 1 ? "sparkle" : GLYPH[c.audience[0]];
}

function CourseCover({ c, ratio = "16 / 10" }: { c: Course; ratio?: string }) {
  return (
    <Cover id={c.id} folder="courses" variant={variantOf(c)} ratio={ratio} glyph={<Icon name={glyphOf(c)} size={64} stroke={1.1} />}>
      <div className="cover-top">
        <span className="pill dark">{c.kind}</span>
      </div>
      <div className="cover-bottom">
        <span className="pill">{c.audienceLabel}</span>
        <span className="pill rose">{c.price}</span>
      </div>
    </Cover>
  );
}

export default function Learn({ flash, inTelegram }: { flash: (t: string) => void; inTelegram: boolean }) {
  const [filter, setFilter] = useState<"all" | Audience>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const list = useMemo(() => courses.filter((c) => filter === "all" || c.audience.includes(filter)), [filter]);
  const current = courses.find((c) => c.id === openId) || null;

  async function enroll(id: string) {
    if (!inTelegram) return openTg(`https://t.me/${CONFIG.telegram.study}`);
    setBusy(id);
    const r = await call("/api/lead", { method: "POST", body: JSON.stringify({ courseId: id }) });
    setBusy(null);
    if (r.ok) {
      flash("Заявка отправлена. Менеджер свяжется с вами");
      setOpenId(null);
    } else if (r.body?.error === "consent") {
      flash("Сначала запустите бота и согласитесь на обработку данных");
      setTimeout(() => openBot("learn"), 900);
    } else flash("Не получилось отправить. Позвоните нам или напишите в Telegram");
  }

  const chips: { id: "all" | Audience; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "doctor", label: "Врачам" },
    { id: "nurse", label: "Среднее мед." },
    { id: "none", label: "Без мед. образования" },
  ];

  return (
    <div className="tab-in">
      <div className="sec-row" style={{ marginTop: 18 }}><h2 className="sec">Программы обучения</h2></div>
      <div className="chips">
        {chips.map((c) => (
          <button key={c.id} className={`chip ${filter === c.id ? "on" : ""}`} onClick={() => setFilter(c.id)}>{c.label}</button>
        ))}
      </div>
      <div className="list">
        {list.map((c) => (
          <button key={c.id} className="course" onClick={() => setOpenId(c.id)}>
            <CourseCover c={c} />
            <div className="meta">
              <h3>{c.title}</h3>
              <p>{c.summary}</p>
              <div className="facts">
                <span><Icon name="clock" size={15} /> {c.duration}</span>
                <span><Icon name="calendar" size={15} /> {c.nextStart}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <h2 className="sec">Преподаватели</h2>
      <div className="rail">
        {teachers.map((t) => {
          const parts = t.name.split(" ");
          return (
            <div key={t.id} className="tcard">
              <Avatar id={t.id} name={t.name} size={72} />
              <b>{parts[0]} {parts[1]}</b>
              <small>{t.role}</small>
            </div>
          );
        })}
      </div>

      <div className="note">
        <span className="ic"><Icon name="shield" /></span>
        <div>
          <b>Лицензированное обучение</b>
          <p>Дипломы регистрируются в ФИС ФРДО. {CONFIG.payment}.</p>
        </div>
      </div>

      <Sheet onClose={() => setOpenId(null)} content={current && (
        <>
          <CourseCover c={current} ratio="16 / 11" />
          <div className="inner">
            <h2>{current.title}</h2>
            <p className="muted" style={{ marginTop: 8 }}>{current.summary}</p>
            <div className="facts" style={{ marginTop: 14 }}>
              <span><Icon name="clock" size={15} /> {current.duration}</span>
              <span><Icon name="calendar" size={15} /> {current.nextStart}</span>
            </div>
            <div className="price-big" style={{ marginTop: 16 }}>{current.price}</div>
            {current.priceNote && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{current.priceNote}</p>}

            {current.program.length > 0 && (<><h4>Программа</h4><ul>{current.program.map((p) => <li key={p}>{p}</li>)}</ul></>)}
            {current.teachers.length > 0 && (<><h4>Преподаватели</h4><p>{current.teachers.join(", ")}</p></>)}
            {current.document && (
              <div className="note"><span className="ic"><Icon name="card" /></span><div><b>Документ</b><p>{current.document}</p></div></div>
            )}
            <div className="btns">
              <button className="btn rose" disabled={busy === current.id} onClick={() => enroll(current.id)}>
                {busy === current.id ? "Отправляем…" : "Записаться"}
              </button>
              <a className="btn ghost" href={`tel:${CONFIG.phones[0].tel}`}>Позвонить</a>
            </div>
          </div>
        </>
      )} />
    </div>
  );
}
