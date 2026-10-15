"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Learn from "@/components/Learn";
import Catalog from "@/components/Catalog";
import Models from "@/components/Models";
import Profile from "@/components/Profile";
import { Icon, type IconName } from "@/components/ui";
import { call, initData, tg, type Me } from "@/components/tg";

type Tab = "learn" | "catalog" | "model" | "profile";

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "learn", label: "Обучение", icon: "cap" },
  { id: "catalog", label: "Каталог", icon: "bag" },
  { id: "model", label: "Модели", icon: "sparkle" },
  { id: "profile", label: "Профиль", icon: "user" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("learn");
  const [me, setMe] = useState<Me | null>(null);
  const [toast, setToast] = useState("");
  const [inTelegram, setInTelegram] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = useCallback((t: string) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    const w = tg();
    setInTelegram(!!initData());
    w?.ready?.();
    w?.expand?.();
    try { w?.setHeaderColor?.("#0a0d18"); w?.setBackgroundColor?.("#0a0d18"); } catch {}
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q === "catalog" || q === "model" || q === "profile" || q === "learn") setTab(q);
  }, []);

  const loadMe = useCallback(async () => {
    if (!initData()) return;
    const r = await call("/api/me");
    if (r.ok) setMe(r.body);
  }, []);
  useEffect(() => { loadMe(); }, [loadMe]);

  return (
    <>
      <header className="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.jpg" alt="" />
        <b>КУПОЛ</b>
        <small>Красноярск</small>
      </header>
      <main>
        {!inTelegram && (
          <div className="note warn">
            <span className="ic"><Icon name="send" /></span>
            <div><b>Откройте через Telegram</b><p>Вне Telegram запись и заявки недоступны. Откройте приложение через бота.</p></div>
          </div>
        )}
        {tab === "learn" && <Learn flash={flash} inTelegram={inTelegram} />}
        {tab === "catalog" && <Catalog />}
        {tab === "model" && <Models />}
        {tab === "profile" && <Profile me={me} />}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
      <nav className="nav" aria-label="Разделы">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} aria-current={tab === t.id} onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }}>
            <Icon name={t.icon} size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
