export const config = {
  baseDomain: process.env.CLOUDFLARE_BASE_DOMAIN ?? null,
  cfProxied: process.env.CLOUDFLARE_PROXIED === 'true',
};
