# RSV360 PMS/CRM — Reservei Viagens
# Copyright (c) 2024-2026 Reservei Viagens LTDA. Todos os direitos reservados.
# Desenvolvido por Douglas P. Figueiredo <douglas@reserveiviagens.com.br>
# @author Douglas P. Figueiredo
# @license UNLICENSED

FROM node:26-alpine AS deps
ARG APP_DIR
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG INTERNAL_API_URL
WORKDIR /workspace
RUN corepack enable && corepack prepare npm@10.9.7 --activate

# Monorepo workspace install — resolve @rsv360/shared via link local (não está no npm registry).
# Stubs de todos os workspaces referenciados no lockfile (apps/*, packages/*, backend).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src/
COPY apps/admin/package.json apps/admin/
COPY apps/guest/package.json apps/guest/
COPY apps/site-publico/package.json apps/site-publico/
COPY apps/turismo/package.json apps/turismo/
COPY backend/package.json backend/

# next pode ficar nested em apps/*/node_modules (npm workspaces) — builder já copia esses paths.
RUN npm ci --ignore-scripts \
  && npm run build --workspace=@rsv360/shared \
  && ( test -d node_modules/next || test -d apps/site-publico/node_modules/next ) \
  && test -d node_modules/react

FROM node:26-alpine AS builder
ARG APP_DIR
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG INTERNAL_API_URL
ARG NEXT_PUBLIC_APP_MODE
ARG NEXT_PUBLIC_PRIMARY_SITE_URL
ARG NEXT_PUBLIC_LAB_TITLE
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG RSV360_APP_MODE
ARG MARKETING_LAB_REQUIRE_AUTH
WORKDIR /workspace
RUN corepack enable && corepack prepare npm@10.9.7 --activate

COPY . .
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/packages/shared/dist ./packages/shared/dist
# Pacotes não hoisted (ex.: lucide-react) ficam em <workspace>/node_modules após npm ci.
RUN --mount=type=bind,from=deps,source=/workspace,target=/deps \
  for ws in apps/site-publico apps/turismo apps/admin apps/guest packages/shared backend; do \
    if [ -d "/deps/${ws}/node_modules" ]; then \
      mkdir -p "/workspace/${ws}" && cp -R "/deps/${ws}/node_modules" "/workspace/${ws}/node_modules"; \
    fi; \
  done
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV INTERNAL_API_URL=${INTERNAL_API_URL}
ENV NEXT_PUBLIC_APP_MODE=${NEXT_PUBLIC_APP_MODE}
ENV NEXT_PUBLIC_PRIMARY_SITE_URL=${NEXT_PUBLIC_PRIMARY_SITE_URL}
ENV NEXT_PUBLIC_LAB_TITLE=${NEXT_PUBLIC_LAB_TITLE}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
ENV RSV360_APP_MODE=${RSV360_APP_MODE}
ENV MARKETING_LAB_REQUIRE_AUTH=${MARKETING_LAB_REQUIRE_AUTH}
ENV PATH="/workspace/node_modules/.bin:${PATH}"
RUN npm run build --workspace="${APP_DIR}"
# Preservar ${APP_DIR} no runtime: symlinks do Turbopack (.next/node_modules/*-hash)
# apontam N níveis acima até /workspace/node_modules — flatten quebra todos (SSR 500).
RUN mkdir -p "/workspace/.deploy/${APP_DIR}" "/workspace/.deploy/packages/shared" \
  && cp -R "${APP_DIR}/.next" "/workspace/.deploy/${APP_DIR}/.next" \
  && cp "${APP_DIR}/package.json" "/workspace/.deploy/${APP_DIR}/package.json" \
  && cp -R /workspace/node_modules "/workspace/.deploy/node_modules" \
  && if [ -d "${APP_DIR}/node_modules" ]; then \
       mkdir -p "/workspace/.deploy/${APP_DIR}/node_modules" \
       && cp -R "${APP_DIR}/node_modules/." "/workspace/.deploy/${APP_DIR}/node_modules/"; \
     fi \
  && if [ -d "packages/shared/dist" ]; then cp -R packages/shared/dist "/workspace/.deploy/packages/shared/dist"; fi \
  && if [ -f "packages/shared/package.json" ]; then cp packages/shared/package.json "/workspace/.deploy/packages/shared/package.json"; fi \
  && mkdir -p "/workspace/.deploy/${APP_DIR}/public" \
  && if [ -d "${APP_DIR}/public" ]; then cp -R "${APP_DIR}/public/." "/workspace/.deploy/${APP_DIR}/public/"; fi

FROM node:26-alpine AS runtime
ARG APP_DIR
ARG APP_PORT=3000
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG INTERNAL_API_URL
WORKDIR /workspace

RUN apk add --no-cache wget
RUN addgroup -S rsv360 && adduser -S rsv360 -G rsv360

COPY --from=builder /workspace/.deploy/node_modules ./node_modules
COPY --from=builder /workspace/.deploy/packages ./packages
COPY --from=builder /workspace/.deploy/${APP_DIR} ./${APP_DIR}

ENV NODE_ENV=production
ENV PORT=${APP_PORT}
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV INTERNAL_API_URL=${INTERNAL_API_URL}

# HEALTHCHECK não expande ARG/ENV na instrução CMD — porta fixada no build via script
RUN printf '%s\n' '#!/bin/sh' "exec wget --no-verbose --tries=1 -O /dev/null http://127.0.0.1:${APP_PORT}/" > /healthcheck.sh \
  && chmod +x /healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD /healthcheck.sh

USER rsv360
WORKDIR /workspace/${APP_DIR}
EXPOSE ${APP_PORT}

CMD ["npm", "run", "start"]
