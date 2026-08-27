import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { EditableFoodEntry, MealType } from '@/components/add-food-entry-sheet';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { deleteMealPhoto, getMealPhotoUrl } from '@/lib/meal-photos';
import { supabase } from '@/lib/supabase';

type FoodLogEntry = {
  id: string;
  name: string;
  quantity_g: number;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  photo_path: string | null;
};

export type MealDetailSheetRef = {
  present: (meal: { mealType: MealType; name: string; icon: string; goal: number }) => void;
  dismiss: () => void;
};

type MealDetailSheetProps = {
  onEntryRemoved?: () => void;
  onEditEntry?: (entry: EditableFoodEntry) => void;
};

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export const MealDetailSheet = forwardRef<MealDetailSheetRef, MealDetailSheetProps>(
  function MealDetailSheet({ onEntryRemoved, onEditEntry }, ref) {
    const theme = useTheme();
    const { session } = useAuth();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%'], []);

    const [meal, setMeal] = useState<{ mealType: MealType; name: string; icon: string; goal: number } | null>(
      null
    );
    const [entries, setEntries] = useState<FoodLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

    const loadEntries = useCallback(async (mealType: MealType) => {
      const userId = session?.user.id;
      if (!userId) {
        setEntries([]);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from('food_logs')
        .select('id, name, quantity_g, calories, carbs_g, protein_g, fat_g, photo_path')
        .eq('user_id', userId)
        .eq('logged_date', todayIso())
        .eq('meal_type', mealType)
        .order('created_at', { ascending: true });
      setEntries(data ?? []);
      setLoading(false);
    }, [session?.user.id]);

    useEffect(() => {
      const entriesWithPhotos = entries.filter((entry) => entry.photo_path);
      if (entriesWithPhotos.length === 0) return;

      let cancelled = false;
      (async () => {
        const resolved = await Promise.all(
          entriesWithPhotos.map(async (entry) => {
            const url = await getMealPhotoUrl(entry.photo_path!);
            return [entry.id, url] as const;
          })
        );
        if (cancelled) return;
        setPhotoUrls((current) => {
          const next = { ...current };
          for (const [id, url] of resolved) {
            if (url) next[id] = url;
          }
          return next;
        });
      })();

      return () => {
        cancelled = true;
      };
    }, [entries]);

    useImperativeHandle(ref, () => ({
      present: (nextMeal) => {
        setMeal(nextMeal);
        loadEntries(nextMeal.mealType);
        sheetRef.current?.expand();
      },
      dismiss: () => sheetRef.current?.close(),
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      []
    );

    function handleEdit(entry: FoodLogEntry) {
      if (!meal) return;
      sheetRef.current?.close();
      onEditEntry?.({
        id: entry.id,
        mealType: meal.mealType,
        name: entry.name,
        quantity_g: entry.quantity_g,
        calories: entry.calories,
        carbs_g: entry.carbs_g,
        protein_g: entry.protein_g,
        fat_g: entry.fat_g,
      });
    }

    async function handleRemove(entryId: string) {
      const removedEntry = entries.find((entry) => entry.id === entryId);
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      await supabase.from('food_logs').delete().eq('id', entryId);
      if (removedEntry?.photo_path) {
        await deleteMealPhoto(removedEntry.photo_path);
      }
      onEntryRemoved?.();
    }

    const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0);

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.surfaceContainerLowest }}
        handleIndicatorStyle={{ backgroundColor: theme.outlineVariant }}>
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {meal ? (
            <>
              <View style={styles.header}>
                <ThemedText style={styles.headerEmoji}>{meal.icon}</ThemedText>
                <View style={styles.headerInfo}>
                  <ThemedText type="headlineMd">{meal.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {Math.round(totalCalories)} / {meal.goal} Cal
                  </ThemedText>
                </View>
              </View>

              {loading ? (
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  Loading…
                </ThemedText>
              ) : entries.length === 0 ? (
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  Nothing logged yet for this meal.
                </ThemedText>
              ) : (
                entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => handleEdit(entry)}
                    style={({ pressed }) => [
                      styles.entryCard,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
                      pressed && styles.pressed,
                    ]}>
                    {photoUrls[entry.id] ? (
                      <Image
                        source={{ uri: photoUrls[entry.id] }}
                        style={styles.entryThumb}
                        contentFit="cover"
                      />
                    ) : null}

                    <View style={styles.entryInfo}>
                      <ThemedText type="bodyLg">{entry.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {entry.quantity_g} g · {Math.round(entry.calories)} Cal
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        C {Math.round(entry.carbs_g)}g · P {Math.round(entry.protein_g)}g · F{' '}
                        {Math.round(entry.fat_g)}g
                      </ThemedText>
                    </View>

                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        handleRemove(entry.id);
                      }}
                      style={({ pressed }) => [
                        styles.removeButton,
                        { backgroundColor: theme.surfaceContainerHighest },
                        pressed && styles.pressed,
                      ]}>
                      <SymbolView
                        name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                        size={16}
                        tintColor={theme.error}
                      />
                    </Pressable>
                  </Pressable>
                ))
              )}
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerInfo: {
    gap: Spacing.half,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Shadows.soft,
  },
  entryInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  entryThumb: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
