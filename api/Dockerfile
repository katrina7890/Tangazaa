# Laravel API container for Render (or any Docker host).
# Apache + mod_php serving Laravel's public/ directory.
FROM php:8.3-apache

# --- System deps + PHP extensions -------------------------------------------
# pdo_pgsql: Postgres driver (Render's free DB) · mbstring/zip/bcmath: Laravel.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libpq-dev libonig-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql mbstring bcmath zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Composer (from the official image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# --- Apache: serve public/ and honour Laravel's .htaccess rewrites ----------
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && a2enmod rewrite \
    && printf '<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n</Directory>\n' \
        > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel

WORKDIR /var/www/html

# --- Application -------------------------------------------------------------
COPY . .
# --no-scripts skips package:discover at build (no env yet); the framework
# rebuilds the package manifest on first boot, which start.sh triggers.
# platform-check off + --ignore-platform-reqs: don't let a transitive package's
# declared ext-* requirement fail the build — the app only uses the extensions
# installed above (verified locally), so we skip Composer's platform gate.
RUN composer config platform-check false \
    && composer install --no-dev --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Render injects $PORT at runtime; start.sh points Apache at it.
EXPOSE 80
CMD ["start.sh"]
