# Deployment guide

This document walks through deploying the API and web panel as two separate
Fly.io applications backed by a managed Neon Postgres database.

## 1. Prerequisites

- A Fly.io account: <https://fly.io/app/sign-up>
- The `flyctl` CLI installed and authenticated: `flyctl auth login`
- A Neon project: <https://console.neon.tech>
- A Cloudflare account with the target domain on Cloudflare nameservers
- A new Cloudflare API token with `Zone.DNS:Edit` on the target zone (the
  one previously placed in `.env.example` was rotated for safety; generate a
  fresh one)

The API and web apps live in:

```
apps/api  →  Fly app: yesip-api
apps/web  →  Fly app: yesip-web
```

## 2. Provision the database

1. In Neon, create a project and a database named `yesip`.
2. Go to **Connection Details** → **Pooled connection** → copy the URL.
3. Add `?sslmode=require` to the end if not already present.
4. Save it as `DATABASE_URL` for both apps below.

The API runs `pnpm --filter @yesip/db exec tsx src/migrate.ts` as a Fly
release command, so the schema is created automatically on every deploy.

## 3. Create the API app

From the repository root:

```bash
flyctl apps create yesip-api --org personal
```

Edit `apps/api/fly.toml` if you want a different `app` name or region.

Set the secrets — these are encrypted in Fly's vault, not visible in the UI:

```bash
flyctl secrets set \
  --app yesip-api \
  DATABASE_URL='postgres://...neon.tech/yesip?sslmode=require' \
  CLOUDFLARE_API_TOKEN='<freshly generated token>' \
  CLOUDFLARE_ZONE_ID='<32-char zone id>' \
  CLOUDFLARE_BASE_DOMAIN='yourdomain.tld' \
  CLOUDFLARE_PROXIED='false'
```

Deploy:

```bash
flyctl deploy --app yesip-api --config apps/api/fly.toml --dockerfile apps/api/Dockerfile
```

The release command runs the Drizzle migration before the new VMs accept
traffic. The healthcheck at `/health` validates that the new machines are
serving requests.

Verify:

```bash
curl https://yesip-api.fly.dev/health
# {"status":"ok"}

curl https://yesip-api.fly.dev/health/ready
# {"status":"ready","db":"up"}
```

## 4. Create the web app

```bash
flyctl apps create yesip-web --org personal
```

Generate a strong session secret:

```bash
openssl rand -base64 48
```

Set secrets:

```bash
flyctl secrets set \
  --app yesip-web \
  DATABASE_URL='postgres://...neon.tech/yesip?sslmode=require' \
  BETTER_AUTH_SECRET='<48 random bytes from openssl>' \
  BETTER_AUTH_URL='https://yesip-web.fly.dev' \
  CLOUDFLARE_BASE_DOMAIN='yourdomain.tld' \
  CLOUDFLARE_PROXIED='false'
```

Deploy:

```bash
flyctl deploy --app yesip-web --config apps/web/fly.toml --dockerfile apps/web/Dockerfile
```

The web app is configured with `auto_stop_machines = "stop"` and
`min_machines_running = 0` — it spins down when idle and starts again on
the first request, which keeps it within the free tier when the panel is
unused.

## 5. Wire your domain (optional)

If you want custom domains in front of `*.fly.dev`:

```bash
# API
flyctl certs add api.yourdomain.tld --app yesip-api

# Panel
flyctl certs add panel.yourdomain.tld --app yesip-web
```

Then add the displayed CNAME records in Cloudflare. After certs go green
update `BETTER_AUTH_URL` to `https://panel.yourdomain.tld` and redeploy
the web app so cookies bind to the right host.

## 6. Configure your router

Use the No-IP-compatible DDNS form on your router with:

- **Service**: No-IP (or "Custom"/"Other" with the URL pattern below)
- **Server**: `yesip-api.fly.dev` (or your custom API hostname)
- **Username**: your account email
- **Password**: an API token from `/dashboard/tokens` (recommended) or your
  account password
- **Hostname**: a hostname under your `CLOUDFLARE_BASE_DOMAIN`
- **Update URL** (for routers that expect a full URL):
  `https://yesip-api.fly.dev/nic/update?hostname=<host>&myip=<ip>`

The API responds in plain text with the standard No-IP result codes
(`good <ip>`, `nochg <ip>`, `nohost`, `badauth`, `badagent`, `abuse`,
`911`).

## 7. Operational notes

- **Logs**: `flyctl logs --app yesip-api` (or `yesip-web`)
- **Roll back**: `flyctl releases list --app yesip-api` then
  `flyctl deploy --image <old-image> --app yesip-api`
- **Scale up**: `flyctl scale memory 512 --app yesip-api`
- **Add a machine**: `flyctl scale count 2 --app yesip-api` (only if you
  also bump the Neon plan; pooled connections can saturate the free tier).
- **Postgres dashboard**: <https://console.neon.tech> — branch the DB to
  test migrations safely.
