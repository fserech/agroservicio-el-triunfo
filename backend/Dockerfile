FROM node:20-alpine

# Instalar dumb-init para manejo correcto de señales PID 1
RUN apk add --no-cache dumb-init

# Crear usuario no-root para ejecutar la app
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeapp -u 1001

WORKDIR /app

# Copiar solo package.json primero (aprovecha cache de Docker)
COPY package.json ./
RUN npm install --production --no-audit --no-fund

# Copiar código fuente
COPY src ./src

# Cambiar propietario al usuario no-root
RUN chown -R nodeapp:nodejs /app

# Ejecutar como usuario no-root
USER nodeapp

EXPOSE 3000

# dumb-init maneja señales correctamente (SIGTERM para graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
