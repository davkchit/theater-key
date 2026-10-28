# Как устроены сайт и бот на сервере

Один VPS (Beget, Ubuntu), без Docker. Caddy держит домен и HTTPS, отдаёт сайт
из `/opt/kluch/site` и пересылает `/api/*` боту на `127.0.0.1:8787`.

| Папка | Что там |
|---|---|
| `/opt/kluch/src` | git-репозиторий сайта, сюда коммитит админка (`deploy/cms/README.md`) |
| `/opt/kluch/site` | ссылка на текущую собранную копию сайта (`site-<время>`) |
| `/opt/kluch/app` | копия кода, из которой работает бот |
| `/opt/kluch/data` | база бота `kluch.sqlite` и `bot.log` |
| `/etc/kluch.env` | настройки и ключи бота (образец: `bot/env.example`) |

Бот — служба `kluch-bot`: пользователь `kluch`, `WorkingDirectory=/opt/kluch/app`,
`EnvironmentFile=/etc/kluch.env`, `ExecStart=/usr/bin/node --no-warnings bot/server/index.mjs`,
`MemoryMax=200M`, писать может только в `/opt/kluch/data`.

## Выложить новую версию

Сайт: `git push server master`, дальше сам (пересборка и `kluch-site-publish`).

Бот (с копией на случай отката):

```sh
cd /opt/kluch && TS=$(date +%s)
cp -a app/bot app/bot.bak-$TS
rm -rf app/bot && cp -a src/bot app/bot && chown -R root:root app/bot
systemctl restart kluch-bot
curl -s http://127.0.0.1:8787/health
```

Откат: `rm -rf app/bot && mv app/bot.bak-<время> app/bot && systemctl restart kluch-bot`.

## Полезное

| Что | Команда |
|---|---|
| Логи бота | `journalctl -u kluch-bot -n 100` или `/opt/kluch/data/bot.log` |
| Жив ли бот, свежее ли знание, включена ли почта | `curl -s http://127.0.0.1:8787/health` |
| Заявки для Excel | `cd /opt/kluch/app && BOT_DATA_DIR=/opt/kluch/data node bot/server/export-leads.mjs` |
| Журнал разговоров с котом | `cd /opt/kluch/app && BOT_DATA_DIR=/opt/kluch/data node bot/server/export-turns.mjs --days=30` |
| Копия базы | каждую ночь, `deploy/backup/` |
