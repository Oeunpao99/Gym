# ---- deps: install dependencies (psycopg2/bcrypt need build tools on some platforms) ----
FROM python:3.12-slim-bookworm AS deps
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ---- dev: hot-reload via uvicorn --reload, source bind-mounted by compose ----
FROM deps AS dev
WORKDIR /app
COPY . .
RUN chmod +x scripts/wait-for-db.sh
EXPOSE 8000
CMD ["sh", "-c", "./scripts/wait-for-db.sh db 5432 && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

# ---- prod: gunicorn+uvicorn workers, non-root ----
FROM python:3.12-slim-bookworm AS prod
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY . .
RUN chmod +x scripts/wait-for-db.sh \
    && groupadd -r app && useradd -r -g app app \
    && chown -R app:app /app

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/app-info || exit 1

# -w 1: the TV/kiosk SSE broadcaster (app/services/sse.py) keeps connected clients
# in an in-memory dict local to one process. Multiple gunicorn workers each get their
# own copy, so a scan handled by worker A would never reach a client connected to
# worker B - confirmed by testing, not theoretical. A single async Uvicorn worker
# already handles many concurrent connections fine since this app is I/O-bound
# (DB queries), not CPU-bound, so there's no throughput reason to run more.
CMD ["sh", "-c", "./scripts/wait-for-db.sh db 5432 && alembic upgrade head && gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 1 -b 0.0.0.0:8000"]
