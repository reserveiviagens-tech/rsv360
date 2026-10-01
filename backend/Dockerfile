# RSV360 PMS/CRM — Reservei Viagens
# Copyright (c) 2024-2026 Reservei Viagens LTDA. Todos os direitos reservados.
# Desenvolvido por Douglas P. Figueiredo <douglas@reserveiviagens.com.br>
# @author Douglas P. Figueiredo
# @license UNLICENSED

FROM node:26-alpine AS deps
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY .github/scripts .github/scripts
RUN npm ci --workspace=backend --workspace=@rsv360/shared --include-workspace-root=false --no-audit --no-fund --ignore-scripts

FROM node:26-alpine AS runtime
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

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

USER rsv360
EXPOSE 3002

CMD ["node", "server.js"]
