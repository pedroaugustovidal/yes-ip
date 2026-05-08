# Deployment guide

This document walks through deploying the API and web panel as two separate
Fly.io applications backed by a managed Neon Postgres database.

## 1. Prerequisites

- A Fly.io account: <https://fly.io/app/sign-up>
- The `flyctl` CLI installed and authenticated: `flyctl auth login`
- A Neon project: <https://console.neon.tech>
- A Cloudflare account with the target domain on Cloudflare nameservers
- A Cloudflare API token with `Zone.DNS:Edit` scoped to the target zone

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

## 5. Wire your domain

### 5.1 Why you almost certainly want `dynupdate.<yourdomain>`

The original No-IP service is reached at `dynupdate.no-ip.com/nic/update`,
and a large fraction of router and modem firmwares **hardcode that
hostname template into the UI**. Two flavours are common:

- The "Server" field is a plain text input you can fully replace. These
  routers (DD-WRT, OpenWrt, ASUSWRT-Merlin, recent TP-Link, MikroTik)
  accept any hostname — you can use `api.yourdomain.tld` or even the
  bare `yesip-api.fly.dev`.
- The "Server" field is a dropdown or split input where the `dynupdate.`
  prefix is fixed and only the second-level domain is editable.
  Many ISP-supplied modems (Vivo, Claro, Oi, several Huawei/ZTE OEM
  builds, older Intelbras/Tenda) and a handful of small-business
  firewalls fall into this bucket. The only string they will let you
  type is the apex (`yourdomain.tld`), which the firmware then concats
  with the literal `dynupdate.` prefix and the literal `/nic/update`
  path.

To make a single deployment work for **both** firmware classes, expose
the API at `dynupdate.<yourdomain>` from day one. Routers in the first
group can still use that hostname (it is just a normal A/CNAME), and
routers in the second group are forced to.

### 5.2 Add the certificate and DNS

```bash
# DDNS endpoint that all routers can reach
flyctl certs add dynupdate.yourdomain.tld --app yesip-api

# Web panel
flyctl certs add panel.yourdomain.tld --app yesip-web
```

In Cloudflare, add the records `flyctl certs show ...` prints. For the
panel a normal `CNAME` to `yesip-web.fly.dev` is enough; for the DDNS
endpoint the choice matters:

| Record               | Proxy status | When to choose                                         |
|----------------------|--------------|--------------------------------------------------------|
| `CNAME dynupdate`    | DNS only 🟫  | All routers speak modern TLS (1.2+) and you want the real client IP at the application layer. |
| `CNAME dynupdate`    | Proxied 🟧   | You have any router that still negotiates TLS 1.0/1.1 (common on 5+ year-old modems). Cloudflare terminates the legacy handshake and re-encrypts to Fly with TLS 1.3. You also get free WAF and edge rate-limit. |

Proxied is the safer default for a public DDNS endpoint. The API already
runs with `TRUST_PROXY=true`, so Fastify reads `Cf-Connecting-IP` /
`X-Forwarded-For` and the rate limiter still keys on the real client IP.

Wait until `flyctl certs show dynupdate.yourdomain.tld --app yesip-api`
reports `Configured = true` and `Certificate Authority = Let's Encrypt`.
Then update `BETTER_AUTH_URL` to `https://panel.yourdomain.tld` and
redeploy the web app so cookies bind to the right host.

### 5.3 Validate the endpoint

```bash
curl -A "test/1.0" \
  -u "you@example.com:yip_<token from the panel>" \
  "https://dynupdate.yourdomain.tld/nic/update?hostname=home.yourdomain.tld&myip=1.2.3.4"
# expected: good 1.2.3.4
```

## 6. Configure your router

Use the No-IP-compatible DDNS form on your router. Pick the column that
matches your firmware:

| Field                     | Modern firmware (free-form server)            | Restricted firmware (only second-level editable) |
|---------------------------|-----------------------------------------------|--------------------------------------------------|
| **Service**               | No-IP (or "Custom"/"Other")                   | No-IP                                            |
| **Server**                | `dynupdate.yourdomain.tld`                    | `yourdomain.tld` *(firmware prepends `dynupdate.` automatically)* |
| **Username**              | your account email                            | your account email                               |
| **Password**              | API token from `/dashboard/tokens`            | API token from `/dashboard/tokens`               |
| **Hostname**              | a hostname under your `CLOUDFLARE_BASE_DOMAIN` | same                                            |

For routers that expose a full URL template instead of separate fields:

```
https://dynupdate.yourdomain.tld/nic/update?hostname=<host>&myip=<ip>
```

The API responds in plain text with the standard No-IP result codes —
`good <ip>`, `nochg <ip>`, `nohost`, `badauth`, `badagent`, `abuse`,
`911` — and always returns HTTP 200, the contract the firmware expects.

## 7. Operational notes

- **Logs**: `flyctl logs --app yesip-api` (or `yesip-web`)
- **Roll back**: `flyctl releases list --app yesip-api` then
  `flyctl deploy --image <old-image> --app yesip-api`
- **Scale up**: `flyctl scale memory 512 --app yesip-api`
- **Add a machine**: `flyctl scale count 2 --app yesip-api` (only if you
  also bump the Neon plan; pooled connections can saturate the free tier).
- **Postgres dashboard**: <https://console.neon.tech> — branch the DB to
  test migrations safely.
