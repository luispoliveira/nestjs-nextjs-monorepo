import { type NextRequest } from 'next/server';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const authApiUrl = process.env.AUTH_API_URL ?? 'http://localhost:3000';
  const search = req.nextUrl.searchParams.toString();
  const target = `${authApiUrl}/api/auth/${path.join('/')}${search ? `?${search}` : ''}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key !== 'host') headers.set(key, value);
  });

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    (init as RequestInit & { duplex: string }).duplex = 'half';
  }

  const upstream = await fetch(target, init);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
