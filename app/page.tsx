"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CONFIG } from "@/lib/config";
import { courses, teachers, upcomingEvents, formatDateRu, type Audience, type ModelEvent } from "@/lib/content";

type Tab = "learn" | "catalog" | "model" | "profile";
type Me = { name: string; verified: boolean; consent: boolean; diplomaStatus: string | null; leads: { course: string; status: string; at: string }[] };
type CatalogProduct = { id: string; category: string; brand: string; title: string; country?: string; restricted?: boolean; price?: string; description: string };
type Catalog = { verified: boolean; categories: { id: string; title: string }[]; products: CatalogProduct[]; lockedCount: number };

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME || "";

const tg = () => (typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined);
const initData = () => tg()?.initData || "";

async function call(path: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, headers: { "content-type": "application/json", "x-telegram-init-data": initData(), ...(init?.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

function openTg(url: string) {
  const w = tg();
  if (w?.openTelegramLink) w.openTelegramLink(url);
  else window.open(url, "_blank");
}
const openBot = (start: string) => (BOT ? openTg(`https://t.me/${BOT}?start=${start}`) : openTg(`https://t.me/${CONFIG.telegram.study}`));

const Icon = {
  learn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-5 9 5-9 5-9-5z" /><path d="M7 11.5V16c0 1.2 2.2 3 5 3s5-1.8 5-3v-4.5" /></svg>
  ),
  catalog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></svg>
  ),
  model: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="M8 10h8M8 14h5" /></svg>
  ),
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("learn");
  const [me, setMe] = useState<Me | null>(null);
  const [toast, setToast] = useState("");
  const [inTelegram, setInTelegram] = useState(false);

  const flash = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    const w = tg();
    setInTelegram(!!initData());
    w?.ready?.();
    w?.expand?.();
    try { w?.setHeaderColor?.("#2d3b5a"); } catch {}
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "catalog" || q === "model" || q === "profile" || q === "learn") setTab(q);
  }, []);

  const loadMe = useCallback(async () => {
    if (!initData()) return;
    const r = await call("/api/me");
    if (r.ok) setMe(r.body);
  }, []);
  useEffect(() => { loadMe(); }, [loadMe]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "learn", label: "Обучение" },
    { id: "catalog", label: "Каталог" },
    { id: "model", label: "Модель" },
    { id: "profile", label: "Профиль" },
  ];

  return (
    <>
      <header className="hero">
        <div className="hero-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.jpg" alt="" />
          <div>
            <h1>КУПОЛ</h1>
            <p>Краевой учебный центр косметологии и массажа · с {CONFIG.since} года</p>
          </div>
        </div>
      </header>
      <main>
        {!inTelegram && (
          <div className="notice" style={{ marginTop: 12 }}>
            Вы открыли страницу вне Telegram. Для записи и заявок откройте приложение через бота.
          </div>
        )}
        {tab === "learn" && <Learn flash={flash} inTelegram={inTelegram} />}
        {tab === "catalog" && <Catalog />}
        {tab === "model" && <Models />}
        {tab === "profile" && <Profile me={me} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
      <nav className="nav">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }}>
            {Icon[t.id]}
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}

/* ---------------- Обучение ---------------- */
function Learn({ flash, inTelegram }: { flash: (t: string) => void; inTelegram: boolean }) {
  const [filter, setFilter] = useState<"all" | Audience>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const list = useMemo(() => courses.filter((c) => filter === "all" || c.audience.includes(filter)), [filter]);

  async function enroll(id: string) {
    if (!inTelegram) return openTg(`https://t.me/${CONFIG.telegram.study}`);
    setBusy(id);
    const r = await call("/api/lead", { method: "POST", body: JSON.stringify({ courseId: id }) });
    setBusy(null);
    if (r.ok) flash("Заявка отправлена. Менеджер свяжется с вами");
    else if (r.body?.error === "consent") { flash("Сначала запустите бота и согласитесь на обработку данных"); setTimeout(() => openBot("learn"), 900); }
    else flash("Не получилось отправить. Позвоните нам или напишите в Telegram");
  }

  const chips: { id: "all" | Audience; label: string }[] = [
    { id: "all", label: "Все" },
    { id: "doctor", label: "Врачам" },
    { id: "nurse", label: "Среднее мед." },
    { id: "none", label: "Без мед. образования" },
  ];

  return (
    <>
      <div className="chips">
        {chips.map((c) => (
          <button key={c.id} className={`chip ${filter === c.id ? "on" : ""}`} onClick={() => setFilter(c.id)}>{c.label}</button>
        ))}
      </div>
      {list.map((c) => (
        <article key={c.id} className={`card ${open === c.id ? "open" : ""}`}>
          <div onClick={() => setOpen(open === c.id ? null : c.id)} style={{ cursor: "pointer" }}>
            <div className="tags">
              <span className="tag kind">{c.kind}</span>
              <span className="tag">{c.audienceLabel}</span>
            </div>
            <div className="row">
              <h3>{c.title}</h3>
              <span className="price">{c.price}</span>
            </div>
            <p className="sum">{c.summary}</p>
            <div className="facts muted">
              <span>⏱ {c.duration}</span>
              <span>📅 {c.nextStart}</span>
            </div>
          </div>
          <div className="more">
            {c.priceNote && <p style={{ marginTop: 0 }}>{c.priceNote}</p>}
            {c.program.length > 0 && (<><b className="h">Программа</b><ul>{c.program.map((p) => <li key={p}>{p}</li>)}</ul></>)}
            {c.teachers.length > 0 && (<><b className="h">Преподаватели</b><p style={{ margin: "4px 0 8px" }}>{c.teachers.join(", ")}</p></>)}
            {c.document && <p className="muted" style={{ margin: 0 }}>🪪 {c.document}</p>}
          </div>
          <div className="btns">
            <button className="btn" disabled={busy === c.id} onClick={() => enroll(c.id)}>{busy === c.id ? "Отправляем…" : "Записаться"}</button>
            <a className="btn ghost" href={`tel:${CONFIG.phones[0].tel}`}>Позвонить</a>
          </div>
        </article>
      ))}

      <h2 className="sec">Преподаватели</h2>
      <div className="card">
        {teachers.map((t) => (
          <div key={t.name} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
            <b>{t.name}</b>
            <div className="muted">{t.role}</div>
          </div>
        ))}
        <p className="muted" style={{ margin: "10px 0 0" }}>Лицензированное обучение, дипломы регистрируются в ФИС ФРДО. {CONFIG.payment}.</p>
      </div>
    </>
  );
}

/* ---------------- Каталог ---------------- */
function Catalog() {
  const [data, setData] = useState<Catalog | null>(null);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    call("/api/catalog").then((r) => (r.ok ? setData(r.body) : setErr(true))).catch(() => setErr(true));
  }, []);

  if (err) return <div className="empty">Не удалось загрузить каталог. Попробуйте позже или напишите @{CONFIG.telegram.orders}</div>;
  if (!data) return <div className="empty">Загрузка…</div>;

  const items = data.products.filter(
    (p) => (cat === "all" || p.category === cat) && (!q || `${p.title} ${p.brand} ${p.description}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      {data.verified ? (
        <div className="notice ok"><b>✅ Доступ специалиста открыт.</b> Вам доступны инъекционные препараты и ботулотоксины. Цены и наличие уточняйте у менеджера.</div>
      ) : (
        <div className="notice">
          <b>🔒 Ещё {data.lockedCount} позиций для специалистов.</b> Инъекционные препараты, ботулотоксины и мезотерапия продаются только дипломированным специалистам. Загрузите диплом, администратор подтвердит его, и раздел откроется.
          <div className="btns"><button className="btn" onClick={() => openBot("diploma")}>Загрузить диплом</button></div>
        </div>
      )}
      <input className="search" placeholder="Поиск по каталогу" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        <button className={`chip ${cat === "all" ? "on" : ""}`} onClick={() => setCat("all")}>Все</button>
        {data.categories.map((c) => (
          <button key={c.id} className={`chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.title}</button>
        ))}
      </div>
      {items.map((p) => (
        <article key={p.id} className="card">
          <div className="tags">
            <span className="tag">{p.brand}</span>
            {p.country && <span className="tag">{p.country}</span>}
          </div>
          <div className="row">
            <h3>{p.title}</h3>
            <span className="price">{p.price || ""}</span>
          </div>
          <p className="sum">{p.description}</p>
          <div className="btns">
            <button className="btn" onClick={() => openTg(`https://t.me/${CONFIG.telegram.orders}`)}>{p.price ? "Заказать" : "Узнать цену и заказать"}</button>
          </div>
        </article>
      ))}
      {items.length === 0 && <div className="empty">Ничего не найдено</div>}
      <p className="muted" style={{ textAlign: "center" }}>{CONFIG.delivery}. Оригинальная продукция, доставка в день заказа.</p>
    </>
  );
}

/* ---------------- Модели ---------------- */
function Models() {
  const [events, setEvents] = useState<ModelEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setEvents(upcomingEvents()); setLoaded(true); }, []);
  return (
    <>
      <div className="notice">
        <b>Станьте моделью.</b> Косметологические процедуры на проверенных препаратах у врачей, по доступным ценам. Процедуры проходят в учебном центре под контролем преподавателей, студенты отрабатывают навыки. Оплачивается препарат.
        <div className="btns"><button className="btn" onClick={() => openBot("model")}>Подать анкету</button></div>
      </div>
      <h2 className="sec">Ближайшие даты</h2>
      {loaded && events.length === 0 && <div className="empty">Новые даты скоро появятся. Следите за каналом @{CONFIG.telegram.models}</div>}
      {events.map((e) => (
        <article key={e.id} className="card">
          <div className="tags">
            <span className="tag kind">{formatDateRu(e.date)}</span>
            {e.note && <span className="tag">{e.note}</span>}
          </div>
          <h3>{e.title}</h3>
          {e.doctor && <div className="muted">Врач: {e.doctor}</div>}
          {e.description && <p className="sum">{e.description}</p>}
          <div className="slots">{e.times.map((t) => <span key={t} className="slot">{t}</span>)}</div>
          <ul className="plist">
            {e.prices.map((p) => (<li key={p.name}><span>{p.name}</span><b>{p.price}</b></li>))}
          </ul>
          <div className="btns">
            <button className="btn" onClick={() => openBot("model")}>Записаться</button>
            <a className="btn ghost" href={`tel:${CONFIG.phones[0].tel}`}>Позвонить</a>
          </div>
        </article>
      ))}
      <p className="muted" style={{ textAlign: "center" }}>Чат моделей: <a href={`https://t.me/${CONFIG.telegram.models}`}>@{CONFIG.telegram.models}</a></p>
    </>
  );
}

/* ---------------- Профиль ---------------- */
function Profile({ me }: { me: Me | null }) {
  const diplomaText =
    me?.verified ? "Подтверждён" : me?.diplomaStatus === "pending" ? "На проверке" : me?.diplomaStatus === "rejected" ? "Отклонён, пришлите заново" : "Не загружен";
  return (
    <>
      <div className="card">
        <h3>{me?.name || "Гость"}</h3>
        <div className="facts" style={{ marginTop: 10 }}>
          <span>Статус специалиста: <b>{diplomaText}</b></span>
        </div>
        {!me?.verified && (
          <div className="btns"><button className="btn" onClick={() => openBot("diploma")}>Загрузить диплом</button></div>
        )}
      </div>

      {me && me.leads.length > 0 && (
        <>
          <h2 className="sec">Мои заявки</h2>
          <div className="card">
            {me.leads.map((l, i) => (
              <div key={i} className="contact-row"><span>{l.course}</span><span className="muted">{new Date(l.at).toLocaleDateString("ru-RU")}</span></div>
            ))}
          </div>
        </>
      )}

      <h2 className="sec">Контакты</h2>
      <div className="card">
        {CONFIG.phones.map((p) => (
          <div key={p.tel} className="contact-row"><span>{p.label}</span><a href={`tel:${p.tel}`}>{p.value}</a></div>
        ))}
        <div className="contact-row"><span>Запись на обучение</span><a href={`https://t.me/${CONFIG.telegram.study}`}>@{CONFIG.telegram.study}</a></div>
        <div className="contact-row"><span>Заказ препаратов</span><a href={`https://t.me/${CONFIG.telegram.orders}`}>@{CONFIG.telegram.orders}</a></div>
        <div className="contact-row"><span>Канал</span><a href={`https://t.me/${CONFIG.telegram.channel}`}>@{CONFIG.telegram.channel}</a></div>
        <div className="contact-row"><span>Сайт</span><a href={CONFIG.site}>kupol.group</a></div>
        <p className="muted" style={{ margin: "10px 0 0" }}>📍 {CONFIG.address}<br />🕒 {CONFIG.hours}<br />💳 {CONFIG.payment}</p>
      </div>
      <p className="muted" style={{ textAlign: "center" }}>{CONFIG.legalName}<br /><a href="/privacy">Политика обработки персональных данных</a></p>
    </>
  );
}
