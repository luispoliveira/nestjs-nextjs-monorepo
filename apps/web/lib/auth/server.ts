import { headers } from 'next/headers';
import { env } from '../../env';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  image?: string | null;
};

type AuthSession = {
  session: { id: string; userId: string; expiresAt: string };
  user: SessionUser;
} | null;

export async function getServerSession(): Promise<AuthSession> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie') ?? '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${env.AUTH_API_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: { cookie },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    return data ?? null;
  } catch {
    return null;
  }
}
