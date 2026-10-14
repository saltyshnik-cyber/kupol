// Контакты и тексты. Источник: профили и описания каналов «Купол», проектная документация.
export const CONFIG = {
  brand: "Купол",
  tagline: "Ваш поставщик красоты",
  since: 2006,
  legalName: "АНО ДПО «Краевой учебный центр косметологии и массажа»",
  address: "г. Красноярск, ул. Партизана Железняка, 21д (ЖК «Перья», 1 этаж, офис 130)",
  hours: "Пн–Пт 10:00–18:00, Сб–Вс выходные",
  site: "https://kupol.group",
  phones: [
    { label: "Учебный центр и запись на процедуры", value: "+7 (905) 976-01-23", tel: "+79059760123" },
    { label: "Общие консультации", value: "+7 (902) 925-39-35", tel: "+79029253935" },
    { label: "Отдел продаж косметики", value: "+7 (391) 219-24-34", tel: "+73912192434" },
  ],
  telegram: {
    study: "kupolstudy", // запись на обучение
    orders: "kupolkosmetic", // заказ препаратов и косметики
    channel: "kupol_cosmetic",
    models: "kupolmodel",
  },
  payment: "Наличные, карты, СБП. Беспроцентная рассрочка на обучение",
  delivery: "Бесплатная доставка от 5 000 ₽",
  tzOffsetHours: 7, // Красноярск, UTC+7
} as const;

export const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME || "";
