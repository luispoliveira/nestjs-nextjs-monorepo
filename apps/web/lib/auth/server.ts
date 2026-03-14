import { headers } from 'next/headers';

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

  const authApiUrl = process.env.AUTH_API_URL;
  if (!authApiUrl) {
    throw new Error('AUTH_API_URL environment variable is not set');
  }

  try {
    const response = await fetch(`${authApiUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: { cookie },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data ?? null;
  } catch {
    return null;
  }
}
