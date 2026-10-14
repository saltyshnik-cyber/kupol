// Подключает бота к задеплоенному сайту и настраивает кнопку меню.
// Запуск: npm run bot:webhook  (нужны BOT_TOKEN, WEBHOOK_SECRET, SITE_URL в .env.local)
const { BOT_TOKEN, WEBHOOK_SECRET, SITE_URL } = process.env;
if (!BOT_TOKEN || !WEBHOOK_SECRET || !SITE_URL) {
  console.error("Нужны BOT_TOKEN, WEBHOOK_SECRET и SITE_URL");
  process.exit(1);
}
const api = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  console.log(method, j.ok ? "OK" : j);
};
const site = SITE_URL.replace(/\/$/, "");
await api("setWebhook", {
  url: `${site}/api/bot`,
  secret_token: WEBHOOK_SECRET,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});
await api("setChatMenuButton", {
  menu_button: { type: "web_app", text: "Купол", web_app: { url: site } },
});
await api("setMyCommands", {
  commands: [
    { command: "start", description: "Главное меню" },
    { command: "contacts", description: "Контакты" },
  ],
});
