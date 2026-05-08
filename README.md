# yes-ip

Self-hosted DDNS service that speaks the same protocol as **No-IP**, so any
router, modem, or DDNS client that supports No-IP can update DNS records
on a domain you control. Updates are pushed to your Cloudflare zone, the
panel runs on Next.js, and the whole thing is designed to fit inside the
free tiers of Fly.io, Neon, and Cloudflare.

## Why

Public DDNS services impose hostname limits, mandatory monthly logins,
upsells, and they own the DNS records on your behalf. If you already own
a domain and run it on Cloudflare, there is no good reason to hand
hostname management to a third party. yes-ip lets you keep the records
under your control while staying drop-in compatible with the No-IP
protocol your hardware already speaks.

## What's inside

- **`apps/api`** — Fastify HTTP API that exposes `/nic/update` (and the
  `/v3/update` alias). Implements the full No-IP response contract:
  plain-text single-line replies (`good <ip>`, `nochg <ip>`, `nohost`,
  `badauth`, `badagent`, `abuse`, `911`) on HTTP 200. Pushes the new IP
  to Cloudflare DNS before persisting it to the database.
- **`apps/web`** — Next.js 15 panel with shadcn-style UI for sign-up /
  sign-in (better-auth, sessions in Postgres), hostname CRUD, update
  history with filters and pagination, and API token management.
- **`packages/db`** — shared Drizzle ORM schema, migrations, and a typed
  `createDb()` factory used by both apps.

## Feature highlights

- **No-IP protocol parity** — Basic Auth, mandatory User-Agent, plain
  text responses, every request returns 200. Tested against curl and a
  mock fetch suite covering create, update, no-change, and CF failure
  paths.
- **Layered rate limiting** — in-memory IP limiter (60/min default) sits
  in front of bcrypt to absorb floods cheaply, atomic per-host limit
  (6/min default) enforced via `UPDATE … RETURNING` in Postgres, and IP
  bans persisted in `ip_bans` so multiple instances eventually agree.
- **Cloudflare DNS push** — minimal client with retry, 10s timeout, and
  reconciliation by record id (with a list-then-create fallback). Hosts
  outside `CLOUDFLARE_BASE_DOMAIN` are rejected with `nohost` so the API
  cannot be tricked into editing records outside your zone.
- **API tokens** — `yip_<24 random base64url chars>`, stored as SHA-256
  hashes, shown to the user in plain only at creation, revocable from
  the panel without touching the account password. Tokens are accepted
  in the password field of the No-IP request alongside email auth.
- **Single source of truth for credentials** — the account password is
  stored once, in `accounts.password`, and used by both the panel
  (better-auth) and the DDNS endpoint.

## Quick start (local development)

Requirements: Node 22, pnpm 11 (via corepack), Docker.

```bash
# 1. Bootstrap
git clone https://github.com/pedroaugustovidal/yes-ip.git
cd yes-ip
cp .env.example .env
corepack enable
pnpm install

# 2. Database
docker compose up -d postgres
pnpm --filter @yesip/db db:migrate

# 3. Run both apps
pnpm dev              # API on :3000, web panel on :3001
```

`apps/api/src/scripts/seed-test.ts` creates a sample user/host for
exercising `/nic/update` from curl. Stop the local apps with Ctrl+C; the
Postgres container keeps running until `pnpm db:down`.

## Sample router request

```http
GET /nic/update?hostname=home.yourdomain.tld&myip=1.2.3.4 HTTP/1.0
Host: dynupdate.yourdomain.tld
Authorization: Basic <base64 of email:yip_token>
User-Agent: yourrouter/1.0
```

Response:

```
good 1.2.3.4
```

## Production deployment

[`DEPLOY.md`](./DEPLOY.md)

Two Fly.io applications backed by a managed Neon Postgres database:

```
apps/api  →  Fly app: yesip-api    (always-on, 256 MB)
apps/web  →  Fly app: yesip-web    (autostop, 512 MB)
```

The full walkthrough — Neon provisioning, Fly secret configuration,
custom-domain wiring (including the `dynupdate.<yourdomain>` subdomain
that restricted firmwares require), and router setup — lives in DEPLOY.md.


## Repository layout

```
.
├── apps/
│   ├── api/              # Fastify DDNS endpoint
│   └── web/              # Next.js panel
├── packages/
│   └── db/               # Drizzle schema + migrations
├── docker-compose.yml    # local Postgres
├── DEPLOY.md             # production deployment guide
└── .env.example          # documented env template
```

## Tech stack

| Layer            | Choice                                              |
|------------------|-----------------------------------------------------|
| Runtime          | Node 22                                             |
| Package manager  | pnpm 11 workspace                                   |
| API              | Fastify 5 + Zod env validation + pino logging       |
| Database         | PostgreSQL 16 (Neon in prod)                        |
| ORM              | Drizzle ORM 0.45 + drizzle-kit migrations           |
| Web              | Next.js 15 + React 19 + Tailwind + shadcn primitives|
| Auth             | better-auth (Drizzle adapter, bcrypt, UUID ids)     |
| DNS              | Cloudflare API (Zone.DNS:Edit token)                |
| Hosting          | Fly.io (two apps, monorepo Dockerfiles)             | 

## License

[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0).

The AGPL extends the GPL's copyleft to network use: if you run a
modified version of yes-ip as a service that other people interact with
(for example, a hosted DDNS for friends or paying users), you must make
the corresponding source code of your modifications available to those
users. Self-hosting an unmodified copy for your own routers does not
trigger any obligation. Forks must keep AGPL-3.0.
