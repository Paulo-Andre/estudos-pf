FROM node:25-bookworm-slim AS frontend
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run check
RUN pnpm exec vite build

FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY backend /app/backend
COPY --from=frontend /src/dist/public /app/dist/public
WORKDIR /app/backend
RUN DEBUG=0 \
    DJANGO_SECRET_KEY=build-only-not-runtime \
    PII_MASTER_KEY=build-only-not-runtime-pii \
    DATABASE_URL=mysql://build:build@127.0.0.1:3306/build \
    python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["sh","-c","python manage.py migrate --noinput && python manage.py protect_pii --strict && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --timeout 60"]
