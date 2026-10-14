import coursesData from "@/data/courses.json";
import productsData from "@/data/products.json";
import eventsData from "@/data/events.json";
import { CONFIG } from "./config";

export type Audience = "doctor" | "nurse" | "none";

export type Course = (typeof coursesData.courses)[number] & { audience: Audience[] };
export const courses = coursesData.courses as Course[];
export const teachers = coursesData.teachers;

export type Product = {
  id: string;
  category: string;
  brand: string;
  title: string;
  country?: string;
  restricted?: boolean;
  price?: string;
  priceB2b?: string;
  description: string;
};
export const productCategories = productsData.categories;
export const products = productsData.products as Product[];

export type ModelEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  doctor?: string;
  times: string[];
  prices: { name: string; price: string }[];
  note?: string;
};
export const allEvents = eventsData.events as ModelEvent[];

export function todayKrsk(): string {
  const d = new Date(Date.now() + CONFIG.tzOffsetHours * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export function upcomingEvents(): ModelEvent[] {
  const t = todayKrsk();
  return allEvents.filter((e) => e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
}

export function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"][dt.getUTCDay()];
  const mon = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"][m - 1];
  return `${d} ${mon}, ${wd}`;
}

export function courseById(id: string) {
  return courses.find((c) => c.id === id);
}

export function coursesFor(a: Audience): Course[] {
  return courses.filter((c) => c.audience.includes(a));
}
