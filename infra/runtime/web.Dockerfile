FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY infra/runtime/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/maestro/ /usr/share/nginx/html/maestro/
USER 101
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
