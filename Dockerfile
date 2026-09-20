FROM php:8.4-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public \
    CI_ENVIRONMENT=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends libicu-dev libonig-dev libzip-dev unzip \
    && docker-php-ext-install intl mbstring opcache zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/* \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress --no-scripts --no-autoloader

COPY . .

RUN composer dump-autoload --no-dev --classmap-authoritative \
    && php spark quizzes:validate \
    && chown -R www-data:www-data writable \
    && chmod +x docker/entrypoint.sh

EXPOSE 10000

ENTRYPOINT ["docker/entrypoint.sh"]
