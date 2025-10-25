FROM nginx:alpine

# Install dependencies and create SSL directory
RUN apk add --no-cache openssl curl ca-certificates && \
    mkdir -p /etc/nginx/ssl/live/library.yourdomain.com

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY conf.d/production.conf /etc/nginx/conf.d/production.conf.template

# Create self-signed certificate for development
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/live/library.yourdomain.com/privkey.pem \
    -out /etc/nginx/ssl/live/library.yourdomain.com/fullchain.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=library.yourdomain.com"

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80 443

# Custom entrypoint script to handle environment-specific configuration
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["nginx", "-g", "daemon off;"]
