import { useCallback, useEffect, useState } from 'react';

import type { MealType } from '@/components/add-food-entry-sheet';
import { useAuth } from '@/context/auth-context';
import { getMealPhotoUrl } from '@/lib/meal-photos';
import { supabase } from '@/lib/supabase';

export type MealPhoto = {
  id: string | null;
  photo_path: string;
  url: string;
  createdAt: string;
  logged: boolean;
  name: string | null;
  logged_date: string | null;
  meal_type: MealType | null;
  calories: number | null;
  quantity_g: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

export function useMealPhotos() {
  const { session } = useAuth();
  const [photos, setPhotos] = useState<MealPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: files } = await supabase.storage
      .from('meal-photos')
      .list(userId, { sortBy: { column: 'created_at', order: 'desc' } });

    const paths = (files ?? []).map((file) => `${userId}/${file.name}`);

    const { data: logRows } = paths.length
      ? await supabase
          .from('food_logs')
          .select(
            'id, name, logged_date, meal_type, calories, quantity_g, carbs_g, protein_g, fat_g, photo_path'
          )
          .eq('user_id', userId)
          .in('photo_path', paths)
      : { data: [] };

    const logsByPath = new Map((logRows ?? []).map((row) => [row.photo_path as string, row]));

    const withUrls = (
      await Promise.all(
        (files ?? []).map(async (file) => {
          const photoPath = `${userId}/${file.name}`;
          const url = await getMealPhotoUrl(photoPath);
          if (!url) return null;
          const log = logsByPath.get(photoPath);
          return {
            id: log?.id ?? null,
            photo_path: photoPath,
            url,
            createdAt: file.created_at ?? '',
            logged: !!log,
            name: log?.name ?? null,
            logged_date: log?.logged_date ?? null,
            meal_type: log?.meal_type ?? null,
            calories: log?.calories ?? null,
            quantity_g: log?.quantity_g ?? null,
            carbs_g: log?.carbs_g ?? null,
            protein_g: log?.protein_g ?? null,
            fat_g: log?.fat_g ?? null,
          } satisfies MealPhoto;
        })
      )
    ).filter((photo): photo is MealPhoto => photo !== null);

    setPhotos(withUrls);
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { photos, loading, refresh };
}
