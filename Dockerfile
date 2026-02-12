FROM node:18-alpine

# Instalar dependencias de Puppeteer para Alpine
RUN apk add --no-cache \
    chromium \
    noto-sans \
    ca-certificates \
    font-dejavu \
    ttf-liberation

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código
COPY . .

# Crear directorios necesarios
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache /app/logs

# Exponer puerto (Heroku lo asignará dinámicamente)
EXPOSE 3000

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Ejecutar bot
CMD ["node", "index.js"]
