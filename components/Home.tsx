"use client";

import { CONFIG } from "@/lib/config";
import { courses, teachers, courseById } from "@/lib/content";
import { Cover, Icon, type IconName } from "./ui";
import { openBot, openTg } from "./tg";

type Tab = "home" | "learn" | "catalog" | "model" | "profile";

const TILES: { tab: Tab; icon: IconName; variant: number; title: string; text: string; cta: string }[] = [
  { tab: "learn", icon: "cap", variant: 0, title: "Учиться", cta: "Смотреть программы",
    text: "Курсы и семинары для врачей, медсестёр и тех, кто начинает с нуля. Практика на моделях, документ об обучении, рассрочка." },
  { tab: "catalog", icon: "bag", variant: 3, title: "Купить препараты", cta: "Открыть каталог",
    text: "Препараты и косметика для косметологов. Инъекционные позиции открываются после проверки диплома." },
  { tab: "model", icon: "sparkle", variant: 1, title: "Стать моделью", cta: "Выбрать дату",
    text: "Процедуры у врачей под контролем преподавателей. Оплачивается только препарат." },
];

export default function Home({ go }: { go: (t: Tab) => void }) {
  const next = courseById("doctor-cosmetology");
  return (
    <div className="tab-in">
      <section className="welcome">
        <p className="kicker">Красноярск, с {CONFIG.since} года</p>
        <h1>Купол</h1>
        <p className="lead">Краевой учебный центр косметологии и массажа и поставщик профессиональных препаратов.</p>
        <div className="stats">
          <div><b>{new Date().getFullYear() - CONFIG.since}</b>года опыта</div>
          <div><b>{courses.length}</b>программ</div>
          <div><b>{teachers.length}</b>преподавателей</div>
        </div>
      </section>

      <h2 className="sec">Что здесь можно сделать</h2>
      <div className="tiles">
        {TILES.map((t) => (
          <button key={t.tab} className="tile" onClick={() => go(t.tab)}>
            <Cover id={`home-${t.tab}`} folder="home" variant={t.variant} ratio="16 / 6" glyph={<Icon name={t.icon} size={56} stroke={1.1} />}>
              <div className="cover-bottom"><h3>{t.title}</h3></div>
            </Cover>
            <div className="tile-body">
              <p>{t.text}</p>
              <span className="tile-cta">{t.cta} <Icon name="chevron" size={16} /></span>
            </div>
          </button>
        ))}
      </div>

      {next && (
        <button className="next" style={{ marginTop: 18 }} onClick={() => go("learn")}>
          <span className="ic"><Icon name="calendar" /></span>
          <span>
            <b>Ближайший старт: {next.nextStart}</b>
            <span>{next.title}</span>
          </span>
          <span className="go"><Icon name="chevron" /></span>
        </button>
      )}

      <h2 className="sec">Связаться</h2>
      <div className="btns" style={{ marginTop: 0 }}>
        <button className="btn rose" onClick={() => openTg(`https://t.me/${CONFIG.telegram.study}`)}><Icon name="send" size={18} /> Написать</button>
        <a className="btn ghost" href={`tel:${CONFIG.phones[0].tel}`}><Icon name="phone" size={18} /> Позвонить</a>
      </div>
      <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
        {CONFIG.address}. {CONFIG.hours}.
      </p>
      <button className="linkbtn" onClick={() => openBot("learn")}>Подобрать курс по образованию в боте</button>
    </div>
  );
}
