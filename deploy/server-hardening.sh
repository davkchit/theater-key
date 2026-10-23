#!/bin/sh
# Basic protection of a fresh Ubuntu VPS for the site. Run once as root,
# before install.sh:   sh deploy/server-hardening.sh
#
# - SSH: keys only, no passwords (stops the bots that guess them all day)
# - firewall: only SSH, 80 and 443 are open; the bot, the admin and
#   decap-server listen on 127.0.0.1 and stay unreachable from outside
# - fail2ban: bans an address for an hour after repeated wrong passwords
#   for SSH or for the admin (/admin, basic auth in Caddy)
# - security updates of Ubuntu install themselves
# - 1 GB of swap, so a build at a busy moment does not get killed for memory
set -eu

if ! grep -qs '^ssh-' /root/.ssh/authorized_keys; then
  echo 'нет ключа в /root/.ssh/authorized_keys: без него после отключения паролей на сервер не войти' >&2
  exit 1
fi

echo '== SSH только по ключу'
cat > /etc/ssh/sshd_config.d/10-kluch.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
MaxAuthTries 4
EOF
sshd -t
systemctl reload ssh

echo '== пакеты'
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ufw fail2ban unattended-upgrades

echo '== файрвол'
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo '== fail2ban'
install -d /var/log/caddy
touch /var/log/caddy/kluch-access.log
cat > /etc/fail2ban/filter.d/kluch-admin.conf <<'EOF'
# a wrong password for /admin: Caddy's JSON access log, status 401
[Definition]
datepattern = "ts":{EPOCH}
failregex = "remote_ip":"<HOST>".*"uri":"/admin[^"]*".*"status":401
ignoreregex =
EOF
cat > /etc/fail2ban/jail.d/kluch.conf <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m

[sshd]
enabled = true
maxretry = 5

[kluch-admin]
enabled = true
port = http,https
filter = kluch-admin
logpath = /var/log/caddy/kluch-access.log
maxretry = 8
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo '== автоматические обновления безопасности'
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades

echo '== swap'
if ! swapon --show | grep -q .; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo
echo 'Готово. Проверить из второго окна, что вход по ключу работает, прежде чем закрывать это.'
echo 'В блоке сайта в Caddyfile нужен журнал для fail2ban (есть в deploy/cms/Caddyfile.snippet).'
