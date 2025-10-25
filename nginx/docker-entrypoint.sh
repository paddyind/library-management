#!/bin/sh

# Use production configuration if NGINX_ENV is production
if [ "$NGINX_ENV" = "production" ]; then
    echo "Using production Nginx configuration..."
    mv /etc/nginx/conf.d/production.conf.template /etc/nginx/conf.d/default.conf
fi

# Execute CMD
exec "$@"
