import { supabase } from '@/lib/supabase';

const BUCKET = 'meal-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function uploadMealPhoto(userId: string, localUri: string) {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const extension = contentType.split('/')[1]?.split(';')[0] ?? 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType,
  });
  if (error) throw error;

  return path;
}

export async function getMealPhotoUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteMealPhoto(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}
