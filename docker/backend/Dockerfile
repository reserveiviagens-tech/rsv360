# ============================================
# RSV360 Backend — imagem de produção (monorepo)
# Resolve @rsv360/shared via workspaces + build do dist em runtime.
# Contexto de build: raiz do repositório (docker-compose / Fase 5 / CD).
# ============================================

FROM node:24-alpine AS deps
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY .github/scripts .github/scripts
RUN npm ci --workspace=backend --workspace=@rsv360/shared --include-workspace-root=false --no-audit --no-fund --ignore-scripts

FROM node:24-alpine AS production
WORKDIR /workspace

RUN apk add --no-cache wget
RUN addgroup -S rsv360 && adduser -S rsv360 -G rsv360

ENV NODE_ENV=production
ENV PORT=3002

COPY --from=deps /workspace/node_modules ./node_modules
COPY backend ./backend
COPY server ./server
COPY packages/shared ./packages/shared
RUN cd packages/shared && npx tsc

WORKDIR /workspace/backend

# Named volumes inherit ownership from the image path they mount over.
# Create uploads tree as rsv360 before USER so fresh volumes are writable (no EACCES).
RUN mkdir -p /workspace/backend/public/uploads/home-sections \
    && chown -R rsv360:rsv360 /workspace/backend/public/uploads

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

USER rsv360
EXPOSE 3002

CMD ["node", "server.js"]
