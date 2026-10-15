---
description: Проверить проект и выкатить на Vercel
---

1. Выполни `npm run typecheck`, `npm run smoke`, `npm run build`. Если что-то падает, почини и повтори.
2. Покажи `git status` и `git diff --stat`. Если есть незакоммиченные изменения, предложи сообщение коммита и спроси, коммитить ли.
3. После подтверждения: `git push`. Vercel подхватит пуш из GitHub и задеплоит сам.
4. Если менялись `db/schema.sql`, напомни выполнить `npm run db:migrate` (нужен `.env.local` из `vercel env pull .env.local`).
5. Если менялся адрес сайта или токен бота, напомни выполнить `npm run bot:webhook`.
