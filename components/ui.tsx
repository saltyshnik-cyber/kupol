"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- иконки ---------- */
export type IconName =
  | "cap" | "drop" | "leaf" | "sparkle" | "wave" | "bag" | "user" | "card" | "phone" | "pin" | "clock"
  | "calendar" | "lock" | "check" | "chevron" | "close" | "search" | "send" | "globe" | "heart" | "shield";

const P: Record<IconName, ReactNode> = {
  cap: (<><path d="M3 9l9-5 9 5-9 5-9-5z" /><path d="M7 11.5V16c0 1.2 2.2 3 5 3s5-1.8 5-3v-4.5" /></>),
  drop: <path d="M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3z" />,
  leaf: (<><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" /><path d="M5 19l7-7" /></>),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />,
  wave: <path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0" />,
  bag: (<><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></>),
  user: (<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>),
  card: (<><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="M8 10h8M8 14h5" /></>),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  pin: (<><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  calendar: (<><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>),
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>),
  send: <path d="M21 4L3 11l6 2.5L11 20l3-4.5 5 3.5L21 4z" />,
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18-3-3-3-15 0-18z" /></>),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />,
  shield: (<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>),
};

export function Icon({ name, size = 22, stroke = 1.7 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[name]}
    </svg>
  );
}

/* ---------- обложки и фото ---------- */
export function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Показывает фото; если файла нет, показывает заглушку. */
export function Photo({ src, fallback, alt = "" }: { src: string; fallback: ReactNode; alt?: string }) {
  const [bad, setBad] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setBad(false);
    // ошибка могла случиться до гидратации
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setBad(true);
  }, [src]);
  if (bad) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} className="photo" src={src} alt={alt} decoding="async" onError={() => setBad(true)} />;
}

const POS = ["18% 30%", "72% 40%", "40% 72%", "85% 20%", "8% 60%"];

/** Обложка: фото из /photos/<folder>/<id>.jpg либо фирменная текстура с символом. */
export function Cover({
  id, folder, variant = 0, glyph, ratio = "16 / 10", className = "", children,
}: { id: string; folder: string; variant?: number; glyph: ReactNode; ratio?: string; className?: string; children?: ReactNode }) {
  const n = (hash(id) % 5) + 1;
  const pos = POS[hash(id + "x") % POS.length];
  return (
    <div className={`cover v${variant} ${className}`} style={{ aspectRatio: ratio }}>
      <Photo
        src={`/photos/${folder}/${id}.jpg`}
        fallback={
          <>
            <div className="tex" style={{ backgroundImage: `url(/brand/tex-${n}.jpg)`, backgroundPosition: pos }} />
            <div className="glyph">{glyph}</div>
          </>
        }
      />
      {children}
    </div>
  );
}

export function Avatar({ id, name, size = 64 }: { id?: string; name: string; size?: number }) {
  const w = name.split(" ");
  const initials = (w[0]?.[0] || "") + (w[1]?.[0] || "");
  const fb = <span className="av-i">{initials}</span>;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {id ? <Photo src={`/photos/teachers/${id}.jpg`} fallback={fb} /> : fb}
    </span>
  );
}

/* ---------- шторка снизу ---------- */
export function Sheet({ content, onClose }: { content: ReactNode | null; onClose: () => void }) {
  const [kept, setKept] = useState<ReactNode>(null);
  const open = !!content;
  useEffect(() => {
    if (content) setKept(content);
  }, [content]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [open, onClose]);
  return (
    <div className={`sheet-wrap ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <button className="sheet-x" onClick={onClose} aria-label="Закрыть"><Icon name="close" size={20} /></button>
        <div className="sheet-body">{open ? content : kept}</div>
      </div>
    </div>
  );
}
