# syntax=docker/dockerfile:1.7-labs
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---------- deps ----------
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false || pnpm install --frozen-lockfile --prod=false --config.dangerouslyAllowAllBuilds=true || true
RUN pnpm rebuild esbuild sharp || true

# ---------- build ----------
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY tsconfig.base.json ./
COPY packages/db packages/db
COPY apps/web apps/web

# Stub secrets so betterAuth init succeeds during build
ENV BETTER_AUTH_SECRET=build_time_placeholder_at_least_32_bytes_xxxxxxx
ENV BETTER_AUTH_URL=http://localhost:3001
ENV DATABASE_URL=postgres://placeholder:placeholder@localhost:5432/placeholder

RUN pnpm --filter @yesip/web build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Next.js standalone bundles its own minimal node_modules
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static

RUN addgroup -S yesip && adduser -S yesip -G yesip && chown -R yesip:yesip /app
USER yesip

EXPOSE 3001
CMD ["node", "apps/web/server.js"]
