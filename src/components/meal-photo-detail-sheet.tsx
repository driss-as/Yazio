import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { MealType } from '@/components/add-food-entry-sheet';
import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { MealPhoto } from '@/hooks/use-meal-photos';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function guessMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 19) return 'snack';
  return 'dinner';
}

export type MealPhotoDetailSheetRef = {
  present: (photo: MealPhoto) => void;
  dismiss: () => void;
};

type MealPhotoDetailSheetProps = {
  onUpdated?: () => void;
};

type NutritionEstimate = {
  dish_name: string;
  estimated_quantity_g: number;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
};

const MEAL_LABELS: Record<NonNullable<MealPhoto['meal_type']>, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function formatDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export const MealPhotoDetailSheet = forwardRef<MealPhotoDetailSheetRef, MealPhotoDetailSheetProps>(
  function MealPhotoDetailSheet({ onUpdated }, ref) {
    const theme = useTheme();
    const { session } = useAuth();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['70%'], []);

    const [photo, setPhoto] = useState<MealPhoto | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      present: (nextPhoto) => {
        setPhoto(nextPhoto);
        setAnalyzeError(null);
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

    async function handleAnalyze() {
      if (!photo) return;
      setAnalyzing(true);
      setAnalyzeError(null);

      const { data, error } = await supabase.functions.invoke<{ estimate: NutritionEstimate }>(
        'analyze-meal-photo',
        { body: { photoPath: photo.photo_path } }
      );

      if (error || !data?.estimate) {
        setAnalyzing(false);
        setAnalyzeError(error?.message ?? 'Could not analyze this photo.');
        return;
      }

      const estimate = data.estimate;
      const fields = {
        name: estimate.dish_name,
        quantity_g: Math.max(1, Math.round(estimate.estimated_quantity_g)),
        calories: Math.round(estimate.calories),
        carbs_g: Math.round(estimate.carbs_g),
        protein_g: Math.round(estimate.protein_g),
        fat_g: Math.round(estimate.fat_g),
      };

      let newId: string | null = photo.id;
      let mealType = photo.meal_type;
      let loggedDate = photo.logged_date;

      if (photo.id) {
        const { error: updateError } = await supabase.from('food_logs').update(fields).eq('id', photo.id);
        if (updateError) {
          setAnalyzing(false);
          setAnalyzeError(updateError.message);
          return;
        }
      } else {
        const userId = session?.user.id;
        if (!userId) {
          setAnalyzing(false);
          setAnalyzeError('You must be signed in.');
          return;
        }

        mealType = guessMealType();
        loggedDate = todayIso();

        const { data: inserted, error: insertError } = await supabase
          .from('food_logs')
          .insert({
            user_id: userId,
            logged_date: loggedDate,
            meal_type: mealType,
            photo_path: photo.photo_path,
            ...fields,
          })
          .select('id')
          .single();

        if (insertError || !inserted) {
          setAnalyzing(false);
          setAnalyzeError(insertError?.message ?? 'Could not save this entry.');
          return;
        }

        newId = inserted.id;
      }

      setPhoto({
        ...photo,
        id: newId,
        logged: true,
        meal_type: mealType,
        logged_date: loggedDate,
        ...fields,
      });
      setAnalyzing(false);
      onUpdated?.();
    }

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
          {photo ? (
            <>
              <Image source={{ uri: photo.url }} style={styles.image} contentFit="cover" />

              <Pressable
                onPress={handleAnalyze}
                disabled={analyzing}
                style={({ pressed }) => [
                  styles.analyzeButton,
                  { backgroundColor: theme.primary },
                  Shadows.soft,
                  (pressed || analyzing) && styles.pressed,
                ]}>
                {analyzing ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <SymbolView
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                    size={18}
                    tintColor={theme.onPrimary}
                  />
                )}
                <ThemedText type="labelLg" style={{ color: theme.onPrimary }}>
                  {analyzing ? 'Analyzing…' : 'Analyze with AI'}
                </ThemedText>
              </Pressable>

              {analyzeError ? (
                <ThemedText type="bodyMd" themeColor="error">
                  {analyzeError}
                </ThemedText>
              ) : null}

              {photo.logged && photo.name && photo.logged_date && photo.meal_type ? (
                <>
                  <View>
                    <ThemedText type="headlineMd">{photo.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDate(photo.logged_date)} · {MEAL_LABELS[photo.meal_type]}
                    </ThemedText>
                  </View>

                  <View
                    style={[
                      styles.statsCard,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
                    ]}>
                    <Stat label="Quantity" value={`${photo.quantity_g} g`} />
                    <Stat label="Calories" value={`${Math.round(photo.calories ?? 0)} kcal`} />
                    <Stat label="Carbs" value={`${Math.round(photo.carbs_g ?? 0)} g`} />
                    <Stat label="Protein" value={`${Math.round(photo.protein_g ?? 0)} g`} />
                    <Stat label="Fat" value={`${Math.round(photo.fat_g ?? 0)} g`} />
                  </View>
                </>
              ) : (
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  Not logged to a meal yet.
                </ThemedText>
              )}
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="headlineMd">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  image: {
    width: '100%',
    height: 260,
    borderRadius: Radii.lg,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
  },
  pressed: {
    opacity: 0.8,
  },
  statsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  stat: {
    flexBasis: '40%',
    flexGrow: 1,
    gap: Spacing.half,
  },
});
