# syntax=docker/dockerfile:1.7-labs
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate
WORKDIR /repo

# ---------- install (full workspace deps) ----------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
# pnpm 11 exits 1 on ignored-but-approved builds; tolerate then rebuild esbuild
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false || pnpm install --frozen-lockfile --prod=false --config.dangerouslyAllowAllBuilds=true || true
RUN pnpm rebuild esbuild || true
RUN node -e "require('tsx/esm/api'); console.log('tsx loadable')"

# ---------- runtime ----------
FROM deps AS runtime
ENV NODE_ENV=production

COPY tsconfig.base.json ./
COPY packages/db packages/db
COPY apps/api apps/api

# Non-root user
RUN addgroup -S yesip && adduser -S yesip -G yesip && chown -R yesip:yesip /repo
USER yesip

EXPOSE 3000
ENV API_HOST=0.0.0.0
ENV API_PORT=3000

CMD ["pnpm", "--filter", "@yesip/api", "exec", "tsx", "src/index.ts"]
