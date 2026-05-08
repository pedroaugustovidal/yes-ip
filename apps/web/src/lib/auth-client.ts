import { createAuthClient } from 'better-auth/react';

const baseURL = typeof window === 'undefined' ? process.env.BETTER_AUTH_URL : undefined;

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient(
  baseURL ? { baseURL } : {},
);

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;
