#!/usr/bin/env bash
set -e

# Render (and most PaaS hosts) tell the app which port to listen on via $PORT.
# Apache is built to listen on 80, so rewrite it to $PORT at boot.
: "${PORT:=80}"
sed -ri "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Rebuild the config cache with the runtime environment, then run migrations.
# (No route:cache — routes/api.php has a closure route, which can't be cached.)
php artisan config:clear
php artisan config:cache
php artisan migrate --force

exec apache2-foreground
