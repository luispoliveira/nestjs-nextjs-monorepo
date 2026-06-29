import { env } from '../env';

export const getImageUrl = (image: string | null) => {
  if (!image) {
    return '';
  }

  const storageUrl =
    env.NEXT_PUBLIC_STORAGE_URL ||
    `${env.NEXT_PUBLIC_API_URL}/uploads/images`;

  return `${storageUrl}/${image}`;
};
