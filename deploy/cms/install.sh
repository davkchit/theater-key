#!/bin/sh
# Sets up the admin on a server where the site already runs (bot/DEPLOY.md).
# Expects a copy of the repository at /opt/kluch/src. Run as root:
#   sh /opt/kluch/src/deploy/cms/install.sh
# The Caddy block (Caddyfile.snippet) is added by hand: the server may host
# other sites, and their config is not this script's business.
set -eu
SRC=/opt/kluch/src
HERE=$SRC/deploy/cms
test -d "$SRC/.git" || { echo "нет репозитория в $SRC" >&2; exit 1; }

id kluch-cms >/dev/null 2>&1 || useradd --system --home-dir /opt/kluch/cms --shell /usr/sbin/nologin kluch-cms
install -d -o kluch-cms -g kluch-cms /opt/kluch/cms
chown -R kluch-cms:kluch-cms "$SRC"

sudo -u kluch-cms git -C "$SRC" config user.name 'Админка сайта'
sudo -u kluch-cms git -C "$SRC" config user.email 'admin@kluch.local'
# a developer can `git push` code here; the working copy follows
sudo -u kluch-cms git -C "$SRC" config receive.denyCurrentBranch updateInstead

echo '== зависимости для сборки сайта (разово, пара минут)'
systemd-run --wait --collect --quiet -p MemoryMax=700M --uid=kluch-cms --gid=kluch-cms \
  -p WorkingDirectory="$SRC" -E HOME=/opt/kluch/cms \
  /usr/bin/npm ci --legacy-peer-deps --no-audit --no-fund --loglevel=error

echo '== decap-server'
(cd /opt/kluch/cms && sudo -u kluch-cms -H npm install --no-audit --no-fund --loglevel=error decap-server@3.11.3)

install -m 755 -o root -g root "$HERE/rebuild.sh" /opt/kluch/cms/rebuild.sh
install -m 755 -o root -g root "$HERE/kluch-site-publish" /usr/local/sbin/kluch-site-publish
install -m 755 -o root -g root "$HERE/bileton-sync.sh" /opt/kluch/cms/bileton-sync.sh
install -m 644 -o root -g root "$HERE/cms-guard.mjs" /opt/kluch/cms/cms-guard.mjs
install -m 644 "$HERE/kluch-cms.service" "$HERE/kluch-cms-guard.service" "$HERE/kluch-rebuild.service" "$HERE/kluch-rebuild.path" "$HERE/kluch-bileton.service" "$HERE/kluch-bileton.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kluch-cms.service kluch-cms-guard.service kluch-rebuild.path kluch-bileton.timer

echo '== ежедневная копия базы заявок'
install -d -m 755 /opt/kluch/backup
install -m 644 -o root -g root "$SRC/deploy/backup/kluch-backup.mjs" /opt/kluch/backup/kluch-backup.mjs
install -m 644 "$SRC/deploy/backup/kluch-backup.service" "$SRC/deploy/backup/kluch-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kluch-backup.timer

echo '== первая сборка'
systemctl start kluch-rebuild.service
systemctl --no-pager -n 3 status kluch-rebuild.service | tail -3

echo
echo 'Готово. Осталось: блок в /etc/caddy/Caddyfile по образцу deploy/cms/Caddyfile.snippet'
echo 'пароль: caddy hash-password  →  caddy validate --config /etc/caddy/Caddyfile  →  systemctl reload caddy'
