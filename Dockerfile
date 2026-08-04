# ---- deps: install dependencies (sqlite3 needs native build tools) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: slim image with only what's needed to run the app ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/gym.db
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json db.js server.js index.html card-view.html ./

RUN groupadd -r app && useradd -r -g app app \
    && mkdir -p /app/data \
    && chown -R app:app /app

USER app
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/app-info',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
