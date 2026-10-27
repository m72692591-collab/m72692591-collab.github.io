FROM php:8.3-fpm-alpine
RUN apk add --no-cache oniguruma-dev && docker-php-ext-install mbstring pdo_mysql
COPY maestro/server/lead-api.php /srv/lead-api.php
COPY infra/runtime/receiver.php /srv/receiver.php
COPY infra/runtime/php-pool.conf /usr/local/etc/php-fpm.d/zz-maestro.conf
USER www-data
EXPOSE 9000
CMD ["php-fpm", "-F"]
