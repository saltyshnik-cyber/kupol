"use client";

import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { Cover, Icon, Sheet, type IconName } from "./ui";
import { call, openBot, openTg } from "./tg";

type P = { id: string; category: string; brand: string; title: string; country?: string; restricted?: boolean; price?: string; description: string };
type Data = { verified: boolean; categories: { id: string; title: string }[]; products: P[]; lockedCount: number };

const VAR: Record<string, number> = { inject: 0, botulin: 3, meso: 1, peel: 2, care: 1, consum: 4 };
const ICON: Record<string, IconName> = { inject: "drop", botulin: "sparkle", meso: "drop", peel: "leaf", care: "heart", consum: "bag" };

function ProdCover({ p, ratio = "1 / 1" }: { p: P; ratio?: string }) {
  return (
    <Cover
      id={p.id} folder="products" variant={VAR[p.category] ?? 0} ratio={ratio}
      glyph={<span style={{ fontSize: 40, letterSpacing: "0.02em" }}>{p.brand.slice(0, 2).toUpperCase()}</span>}
    >
      {p.restricted && (
        <div className="cover-top"><span className="pill dark"><Icon name="shield" size={13} /> Для специалистов</span></div>
      )}
    </Cover>
  );
}

export default function Catalog() {
  const [data, setData] = useState<Data | null>(null);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [err, setErr] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    call("/api/catalog").then((r) => (r.ok ? setData(r.body) : setErr(true))).catch(() => setErr(true));
  }, []);

  if (err) return <div className="empty">Не удалось загрузить каталог. Попробуйте позже или напишите @{CONFIG.telegram.orders}</div>;
  if (!data) return <div className="tab-in" style={{ marginTop: 16 }}><div className="skel" /></div>;

  const items = data.products.filter(
    (p) => (cat === "all" || p.category === cat) && (!q || `${p.title} ${p.brand} ${p.description}`.toLowerCase().includes(q.toLowerCase())),
  );
  const current = data.products.find((p) => p.id === openId) || null;

  return (
    <div className="tab-in">
      <div className="search">
        <span className="ic"><Icon name="search" size={20} /></span>
        <input placeholder="Найти препарат или бренд" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        <button className={`chip ${cat === "all" ? "on" : ""}`} onClick={() => setCat("all")}>Все</button>
        {data.categories.map((c) => (
          <button key={c.id} className={`chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.title}</button>
        ))}
      </div>

      {data.verified && (
        <div className="note ok">
          <span className="ic"><Icon name="check" /></span>
          <div><b>Доступ специалиста открыт</b><p>Инъекционные препараты и ботулотоксины доступны. Цены и наличие уточняйте у менеджера.</p></div>
        </div>
      )}

      <div className="grid" style={{ marginTop: 12 }}>
        {items.map((p) => (
          <button key={p.id} className="prod" onClick={() => setOpenId(p.id)}>
            <ProdCover p={p} />
            <div className="meta">
              <small>{p.brand}</small>
              <b>{p.title}</b>
              <small>{p.price || "Цена по запросу"}</small>
            </div>
          </button>
        ))}
      </div>
      {items.length === 0 && <div className="empty">Ничего не нашли. Попробуйте другое слово.</div>}

      {!data.verified && (
        <div className="lockcard">
          <span className="ic"><Icon name="lock" /></span>
          <h3>Ещё {data.lockedCount} позиций для специалистов</h3>
          <p>Инъекционные препараты, ботулотоксины и мезотерапия продаются по диплому. Загрузите его, администратор подтвердит, и раздел откроется.</p>
          <button className="btn" onClick={() => openBot("diploma")}>Загрузить диплом</button>
        </div>
      )}

      <p className="muted" style={{ textAlign: "center", fontSize: 13, marginTop: 20 }}>
        {CONFIG.delivery}. Оригинальная продукция, доставка в день заказа.
      </p>

      <Sheet onClose={() => setOpenId(null)} content={current && (
        <>
          <ProdCover p={current} ratio="4 / 3" />
          <div className="inner">
            <div className="facts" style={{ marginTop: 0 }}>
              <span>{current.brand}</span>
              {current.country && <span><Icon name="globe" size={15} /> {current.country}</span>}
            </div>
            <h2 style={{ marginTop: 8 }}>{current.title}</h2>
            <p className="muted" style={{ marginTop: 10 }}>{current.description}</p>
            <div className="price-big" style={{ marginTop: 16 }}>{current.price || "Цена по запросу"}</div>
            <div className="btns">
              <button className="btn rose" onClick={() => openTg(`https://t.me/${CONFIG.telegram.orders}`)}>
                <Icon name="send" size={18} /> {current.price ? "Заказать" : "Узнать цену"}
              </button>
            </div>
          </div>
        </>
      )} />
    </div>
  );
}
