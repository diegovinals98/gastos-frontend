# Multi-stage build para Expo Web

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para Expo
RUN apk add --no-cache python3 make g++

# Copiar archivos de dependencias
COPY package*.json ./
COPY app.json ./
COPY babel.config.js ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar la aplicación para web
# Expo export genera los archivos estáticos en dist/ por defecto
RUN npx expo export --platform web

# Verificar qué directorio se generó y prepararlo para la copia
# Expo puede generar en dist/, web-build/, o .expo/web/
RUN BUILD_DIR="" && \
    if [ -d "/app/dist" ]; then \
      BUILD_DIR="/app/dist"; \
    elif [ -d "/app/web-build" ]; then \
      BUILD_DIR="/app/web-build"; \
    elif [ -d "/app/.expo/web" ]; then \
      BUILD_DIR="/app/.expo/web"; \
    else \
      echo "ERROR: No build directory found. Listing /app:"; \
      ls -la /app/; \
      exit 1; \
    fi && \
    mkdir -p /app/web-build && \
    cp -r $BUILD_DIR/* /app/web-build/ && \
    echo "Build files copied to /app/web-build from $BUILD_DIR"

# Stage 2: Production
FROM nginx:alpine

# Copiar archivos compilados desde el stage de build
COPY --from=builder /app/web-build /usr/share/nginx/html

# Configuración de nginx para SPA (Single Page Application)
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    ' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Configuración para SPA - todas las rutas van a index.html' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '    ' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Cache para assets estáticos' >> /etc/nginx/conf.d/default.conf && \
    echo '    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        expires 1y;' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Cache-Control "public, immutable";' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '    ' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Compresión gzip' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip on;' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip_vary on;' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip_min_length 1024;' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

