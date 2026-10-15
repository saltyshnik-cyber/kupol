"use client";

import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { upcomingEvents, formatDateRu, type ModelEvent } from "@/lib/content";
import { Cover, Icon } from "./ui";
import { openBot, openTg } from "./tg";

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const dayOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { wd: WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], d };
};

export default function Models() {
  const [events, setEvents] = useState<ModelEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    const e = upcomingEvents();
    setEvents(e);
    setDate(e[0]?.date ?? null);
    setLoaded(true);
  }, []);

  const dates = Array.from(new Set(events.map((e) => e.date)));
  const shown = events.filter((e) => e.date === date);

  return (
    <div className="tab-in">
      <section className="hero rose-hero">
        <h2>Станьте моделью</h2>
        <p>Процедуры у врачей под контролем преподавателей. Оплачивается только препарат.</p>
        <button className="btn" onClick={() => openBot("model")}>Подать анкету</button>
      </section>

      <button className="chatcard" onClick={() => openTg(`https://t.me/${CONFIG.telegram.models}`)}>
        <span className="ic"><Icon name="send" size={22} /></span>
        <span className="tx"><b>Чат моделей</b><small>Свободные окошки и новые даты, @{CONFIG.telegram.models}</small></span>
        <span className="go">Открыть</span>
      </button>

      <h2 className="sec">Ближайшие даты</h2>
      {loaded && events.length === 0 && <div className="empty">Новые даты скоро появятся. Следите за каналом @{CONFIG.telegram.models}</div>}
      {dates.length > 0 && (
        <div className="dates">
          {dates.map((d) => {
            const x = dayOf(d);
            return (
              <button key={d} className={`day ${date === d ? "on" : ""}`} onClick={() => setDate(d)}>
                <small>{x.wd}</small><b>{x.d}</b>
              </button>
            );
          })}
        </div>
      )}
      {date && <p className="muted" style={{ margin: "4px 0 12px" }}>{formatDateRu(date)}</p>}

      {shown.map((e) => (
        <article key={e.id} className="event">
          <Cover id={e.id} folder="events" variant={1} ratio="21 / 8" glyph={<Icon name="sparkle" size={52} stroke={1.1} />}>
            {e.note && <div className="cover-top"><span className="pill rose">{e.note}</span></div>}
          </Cover>
          <div className="body">
            <h3>{e.title}</h3>
            {e.doctor && <p className="muted" style={{ marginTop: 4 }}>Врач: {e.doctor}</p>}
            {e.description && <p style={{ marginTop: 8, fontSize: 14 }}>{e.description}</p>}
            <div className="slots">{e.times.map((t) => <span key={t} className="slot">{t}</span>)}</div>
            <ul className="plist">
              {e.prices.map((p) => (<li key={p.name}><span>{p.name}</span><b>{p.price}</b></li>))}
            </ul>
            <div className="btns">
              <button className="btn rose" onClick={() => openBot("model")}>Записаться</button>
              <a className="btn ghost" href={`tel:${CONFIG.phones[0].tel}`}>Позвонить</a>
            </div>
          </div>
        </article>
      ))}

      <h2 className="sec">Как это работает</h2>
      <div className="steps">
        <div className="step"><span className="n">1</span><p>Заполните анкету в боте: имя, телефон, фото лица</p></div>
        <div className="step"><span className="n">2</span><p>Администратор подберёт время и процедуру</p></div>
        <div className="step"><span className="n">3</span><p>Приходите в центр: процедуру делает врач, студенты наблюдают</p></div>
      </div>
    </div>
  );
}
