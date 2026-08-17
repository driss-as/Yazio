import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MealType } from '@/components/add-food-entry-sheet';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type FoodLogEntry = {
  id: string;
  name: string;
  quantity_g: number;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
};

export type MealDetailSheetRef = {
  present: (meal: { mealType: MealType; name: string; icon: string; goal: number }) => void;
  dismiss: () => void;
};

type MealDetailSheetProps = {
  onEntryRemoved?: () => void;
};

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export const MealDetailSheet = forwardRef<MealDetailSheetRef, MealDetailSheetProps>(
  function MealDetailSheet({ onEntryRemoved }, ref) {
    const theme = useTheme();
    const { session } = useAuth();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['60%'], []);

    const [meal, setMeal] = useState<{ mealType: MealType; name: string; icon: string; goal: number } | null>(
      null
    );
    const [entries, setEntries] = useState<FoodLogEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const loadEntries = useCallback(async (mealType: MealType) => {
      const userId = session?.user.id;
      if (!userId) {
        setEntries([]);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from('food_logs')
        .select('id, name, quantity_g, calories, carbs_g, protein_g, fat_g')
        .eq('user_id', userId)
        .eq('logged_date', todayIso())
        .eq('meal_type', mealType)
        .order('created_at', { ascending: true });
      setEntries(data ?? []);
      setLoading(false);
    }, [session?.user.id]);

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

    async function handleRemove(entryId: string) {
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      await supabase.from('food_logs').delete().eq('id', entryId);
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
                  <View
                    key={entry.id}
                    style={[
                      styles.entryCard,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
                    ]}>
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
                      onPress={() => handleRemove(entry.id)}
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
                  </View>
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
