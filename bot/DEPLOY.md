# Деплой сайта и бота на VPS

Сайт и бот работают в двух Docker-контейнерах (`docker-compose.yml` в корне):

| Контейнер | Что делает | Память |
|---|---|---|
| `site` | отдаёт сайт, пересылает `/api/*` боту | до 96 МБ |
| `bot` | Telegram, заявки с сайта, почта, база заявок | до 256 МБ |

Наружу открыт только `127.0.0.1:8080`, то есть порт виден лишь самому серверу.
HTTPS и домен делает прокси, который уже обслуживает другие проекты на сервере.
Заявки и диалоги лежат в `bot/data/` на диске сервера, вне контейнеров:
пересборка и перезапуск их не трогают.

## 0. Сначала посмотреть, ничего не меняя

На сервере уже работают другие проекты, их нельзя уронить.

```sh
free -h                 # сколько памяти свободно (нам нужно ~350 МБ)
df -h /                 # место на диске (нужно ~2 ГБ под образы)
docker ps               # что уже запущено в Docker
sudo ss -tlnp           # кто занял порты, особенно 80, 443 и 8080
```

Если порт 8080 занят, в шаге 2 укажите другой: `SITE_PORT=8091`.
Если на 80/443 уже стоит nginx или Caddy, используйте его (шаг 3), свой не ставьте.

Проверить, доступны ли с сервера Telegram и модель:

```sh
curl -sS -o /dev/null -w "Telegram %{http_code}\n" https://api.telegram.org
curl -sS -o /dev/null -w "Яндекс %{http_code}\n" https://llm.api.cloud.yandex.net
curl -sS -o /dev/null -w "Groq %{http_code}\n" https://api.groq.com
```

Groq из России, скорее всего, закрыт: в проде бот работает на Яндексе.
Если закрыт Telegram, заявки всё равно приходят на почту.

## 1. Код и настройки

```sh
sudo mkdir -p /opt/kluch && sudo chown $USER /opt/kluch
git clone https://github.com/davkchit/the-key-theater-site.git /opt/kluch
cd /opt/kluch
cp bot/env.example .env.bot
nano .env.bot           # вписать токен бота, ключ модели, почту
```

## 2. Запуск

```sh
./deploy.sh             # или: SITE_PORT=8091 docker compose up -d --build
```

Первая сборка занимает несколько минут. Проверка:

```sh
curl -s http://127.0.0.1:8080/ | head -c 200      # сайт
curl -s http://127.0.0.1:8080/knowledge.json | head -c 100
docker compose logs --tail=20 bot                 # «бот запущен: @theatreklychbot»
```

## 3. Домен и HTTPS

Пока своего домена нет, подойдёт бесплатный адрес вида `<IP>.sslip.io`:
например, `123.45.67.89.sslip.io`. Он сам указывает на IP сервера, покупать
ничего не нужно, и HTTPS на нём работает.

**Если на сервере nginx**, добавить файл `/etc/nginx/sites-available/kluch`:

```nginx
server {
    listen 80;
    server_name 123.45.67.89.sslip.io;
    client_max_body_size 1m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```sh
sudo ln -s /etc/nginx/sites-available/kluch /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx          # nginx -t проверяет, что другие сайты не сломаются
sudo certbot --nginx -d 123.45.67.89.sslip.io         # HTTPS
```

**Если на сервере Caddy**, дописать в его Caddyfile (HTTPS он сделает сам):

```
123.45.67.89.sslip.io {
	reverse_proxy 127.0.0.1:8080
}
```

```sh
sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

**Если на 80/443 ничего нет**, поставить Caddy по [официальной инструкции](https://caddyserver.com/docs/install) и сделать как выше.

## 4. Вход в админку

Админка сайта (`/admin`) сохраняет изменения на этом же сервере, не в
GitHub: вход по паролю Caddy, сохранение идёт коммитом в git на сервере, и
сайт пересобирается сам. Как это устроено и как поставить: `deploy/cms/README.md`.
Вход через GitHub (`oauth.mjs`) убран.

## 5. Бэкап

```sh
crontab -e
# добавить строку:
15 3 * * *  /opt/kluch/bot/backup.sh >> /opt/kluch/bot/data/backup.log 2>&1
```

Каждую ночь копия базы заявок в `bot/data/backups/`, хранятся 14 дней.
Копии лежат на том же сервере; раз в неделю стоит скачивать одну к себе.

## Обслуживание

| Задача | Команда |
|---|---|
| Обновить до свежего коммита | `./deploy.sh` |
| Логи бота | `docker compose logs --tail=100 -f bot` |
| Выгрузить заявки для Excel | `docker compose exec bot node bot/server/export-leads.mjs --out=/data/заявки.csv`, файл появится в `bot/data/` |
| Перезапуск | `docker compose restart` |
| Остановить всё | `docker compose down` (данные останутся) |
| Жив ли бот, свежее ли знание, включена ли почта | `docker compose exec bot wget -qO- http://127.0.0.1:8787/health` |

## Переезд на Beget

Нужен **VPS** на Beget, не обычный хостинг: боту нужен постоянно работающий
процесс. Переезд: поднять там то же самое по шагам 1–5 и перенести папку
`bot/data/` (заявки и диалоги), остановив бота на старом сервере.
