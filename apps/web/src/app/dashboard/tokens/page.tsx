import { requireSession } from '@/lib/session';
import { getUserTokens } from '@/lib/api-tokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateTokenForm } from '@/components/tokens/create-token-form';
import { TokenRow } from '@/components/tokens/token-row';

export default async function TokensPage() {
  const session = await requireSession();
  const tokens = await getUserTokens(session.user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API tokens</h1>
        <p className="text-sm text-muted-foreground">
          Use tokens as the password in router DDNS settings instead of your account password.
          Tokens can be revoked anytime without changing your login.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate a new token</CardTitle>
          <CardDescription>
            Tokens look like{' '}
            <code className="font-mono">yip_xxxxxxxx…</code>. The full value is shown only once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTokenForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing tokens</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tokens.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No tokens yet.
            </p>
          ) : (
            tokens.map((t) => (
              <TokenRow
                key={t.id}
                token={{
                  id: t.id,
                  label: t.label,
                  tokenPrefix: t.tokenPrefix,
                  lastUsedAt: t.lastUsedAt,
                  revokedAt: t.revokedAt,
                  createdAt: t.createdAt,
                }}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
