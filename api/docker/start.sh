#!/usr/bin/env bash
set -e

# Render (and most PaaS hosts) tell the app which port to listen on via $PORT.
# Write Apache's port + vhost fresh from it so there's no chance of a stale :80.
: "${PORT:=80}"

cat > /etc/apache2/ports.conf <<CONF
Listen ${PORT}
CONF

cat > /etc/apache2/sites-available/000-default.conf <<CONF
<VirtualHost *:${PORT}>
    ServerName localhost
    DocumentRoot /var/www/html/public
    <Directory /var/www/html/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
CONF

# Rebuild the config cache with the runtime environment, then run migrations.
# (No route:cache — routes/api.php has a closure route, which can't be cached.)
php artisan config:clear
php artisan config:cache
php artisan migrate --force

# Populate demo data on first boot. DatabaseSeeder is guarded to no-op once the
# demo accounts exist, so this is safe to run on every deploy.
php artisan db:seed --force

exec apache2-foreground
