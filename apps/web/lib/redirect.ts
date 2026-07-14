import { redirect } from 'next/navigation';

import { env } from '@/env';

export function redirectTo(path: string): never {
  redirect(`${env.NEXT_PUBLIC_BASE_PATH}${path}`);
}
