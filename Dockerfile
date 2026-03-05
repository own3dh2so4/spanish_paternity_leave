FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ── Development target ────────────────────────────────────────────────────────
FROM base AS dev
RUN npm ci
COPY . .
EXPOSE 5173
# --host 0.0.0.0 is required so Vite is reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Build target ──────────────────────────────────────────────────────────────
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# ── Production target (nginx) ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -q -O /dev/null http://localhost/ || exit 1
