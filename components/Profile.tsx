"use client";

import { CONFIG } from "@/lib/config";
import { Avatar, Icon, type IconName } from "./ui";
import { openBot, openLink, openTg, type Me } from "./tg";

export default function Profile({ me }: { me: Me | null }) {
  const status = me?.verified ? 2 : me?.diplomaStatus === "pending" ? 1 : 0;
  const rejected = !me?.verified && me?.diplomaStatus === "rejected";
  const steps = ["Загрузить диплом", "Проверка", "Готово"];
  const mapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent("Красноярск, ул. Партизана Железняка, 21д")}`;

  const Row = ({ icon, title, sub, onClick, href }: { icon: IconName; title: string; sub?: string; onClick?: () => void; href?: string }) => {
    const inner = (
      <>
        <span className="ic"><Icon name={icon} size={19} /></span>
        <span><b>{title}</b>{sub && <small>{sub}</small>}</span>
        <span className="chev"><Icon name="chevron" size={18} /></span>
      </>
    );
    return href ? <a className="row" href={href}>{inner}</a> : <button className="row" onClick={onClick}>{inner}</button>;
  };

  return (
    <div className="tab-in">
      <div className="me">
        <Avatar name={me?.name || "Гость"} size={64} />
        <div>
          <h2>{me?.name || "Гость"}</h2>
          <p className="muted">{me?.verified ? "Специалист, диплом подтверждён" : "Каталог для специалистов закрыт"}</p>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ fontSize: 19 }}>Диплом</h3>
        <div className="progress">
          {steps.map((s, i) => (
            <div key={s} className={i < status || (status === 2 && i === 2) ? "done" : i === status ? "cur" : ""}>
              <i />{s}
            </div>
          ))}
        </div>
        {rejected && <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>Диплом отклонён. Пришлите другое фото, на нём должны быть читаемы ФИО и специальность.</p>}
        {!me?.verified && status !== 1 && (
          <button className="btn rose wide" style={{ marginTop: 14 }} onClick={() => openBot("diploma")}>Загрузить диплом</button>
        )}
        {status === 1 && <p className="muted" style={{ marginTop: 12, fontSize: 14 }}>Мы проверяем диплом и сообщим в Telegram, когда каталог откроется.</p>}
      </div>

      {me && me.leads.length > 0 && (
        <>
          <h2 className="sec">Мои заявки</h2>
          <div className="rows">
            {me.leads.map((l, i) => (
              <div key={i} className="row">
                <span className="ic"><Icon name="cap" size={19} /></span>
                <span><b>{l.course}</b><small>{new Date(l.at).toLocaleDateString("ru-RU")}</small></span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="sec">Связаться</h2>
      <div className="rows">
        <Row icon="send" title="Запись на обучение" sub={`@${CONFIG.telegram.study}`} onClick={() => openTg(`https://t.me/${CONFIG.telegram.study}`)} />
        <Row icon="bag" title="Заказ препаратов" sub={`@${CONFIG.telegram.orders}`} onClick={() => openTg(`https://t.me/${CONFIG.telegram.orders}`)} />
        {CONFIG.phones.map((p) => (
          <Row key={p.tel} icon="phone" title={p.value} sub={p.label} href={`tel:${p.tel}`} />
        ))}
        <Row icon="heart" title="Канал" sub={`@${CONFIG.telegram.channel}`} onClick={() => openTg(`https://t.me/${CONFIG.telegram.channel}`)} />
        <Row icon="globe" title="kupol.group" sub="Сайт" onClick={() => openLink(CONFIG.site)} />
      </div>

      <h2 className="sec">Как нас найти</h2>
      <div className="rows">
        <Row icon="pin" title="Красноярск, ул. Партизана Железняка, 21д" sub="ЖК «Перья», 1 этаж, офис 130" onClick={() => openLink(mapUrl)} />
        <div className="row"><span className="ic"><Icon name="clock" size={19} /></span><span><b>{CONFIG.hours}</b></span></div>
        <div className="row"><span className="ic"><Icon name="card" size={19} /></span><span><b>Оплата</b><small>{CONFIG.payment}</small></span></div>
      </div>

      <p className="legal">{CONFIG.legalName}<br /><a href="/privacy">Политика обработки персональных данных</a></p>
    </div>
  );
}
