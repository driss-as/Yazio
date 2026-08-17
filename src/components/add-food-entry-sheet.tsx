import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// BottomSheetTextInput relies on TextInput.State.currentlyFocusedInput, which
// react-native-web doesn't implement. Fall back to a plain TextInput on web.
const SheetTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
];

export type AddFoodEntrySheetRef = {
  present: (mealType?: MealType) => void;
  dismiss: () => void;
};

type AddFoodEntrySheetProps = {
  onEntryAdded?: () => void;
};

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export const AddFoodEntrySheet = forwardRef<AddFoodEntrySheetRef, AddFoodEntrySheetProps>(
  function AddFoodEntrySheet({ onEntryAdded }, ref) {
    const theme = useTheme();
    const { session } = useAuth();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['75%'], []);

    const [mealType, setMealType] = useState<MealType>('breakfast');
    const [name, setName] = useState('');
    const [quantityG, setQuantityG] = useState('');
    const [calories, setCalories] = useState('');
    const [carbsG, setCarbsG] = useState('');
    const [proteinG, setProteinG] = useState('');
    const [fatG, setFatG] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function reset() {
      setName('');
      setQuantityG('');
      setCalories('');
      setCarbsG('');
      setProteinG('');
      setFatG('');
      setError(null);
      setSubmitting(false);
    }

    useImperativeHandle(ref, () => ({
      present: (initialMealType) => {
        reset();
        setMealType(initialMealType ?? 'breakfast');
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

    async function handleSubmit() {
      const userId = session?.user.id;
      if (!userId) {
        setError('You must be signed in.');
        return;
      }

      const quantity = parseNumber(quantityG);
      const caloriesValue = parseNumber(calories);

      if (!name.trim()) {
        setError('Enter a food name.');
        return;
      }
      if (!quantity || quantity <= 0) {
        setError('Enter a valid quantity in grams.');
        return;
      }
      if (Number.isNaN(caloriesValue) || caloriesValue < 0) {
        setError('Enter valid calories.');
        return;
      }

      setSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase.from('food_logs').insert({
        user_id: userId,
        logged_date: todayIso(),
        meal_type: mealType,
        name: name.trim(),
        quantity_g: quantity,
        calories: caloriesValue,
        carbs_g: parseNumber(carbsG) || 0,
        protein_g: parseNumber(proteinG) || 0,
        fat_g: parseNumber(fatG) || 0,
      });

      setSubmitting(false);

      if (insertError) {
        setError(insertError.message);
        return;
      }

      onEntryAdded?.();
      sheetRef.current?.close();
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
        <BottomSheetView style={styles.content}>
          <ThemedText type="headlineMd" style={styles.title}>
            Log food
          </ThemedText>

          <View style={styles.mealRow}>
            {MEAL_OPTIONS.map((option) => {
              const selected = option.value === mealType;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMealType(option.value)}
                  style={[
                    styles.mealOption,
                    {
                      backgroundColor: selected ? theme.primary : theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText
                    type="labelLg"
                    style={{ color: selected ? theme.onPrimary : theme.textSecondary }}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Food name
            </ThemedText>
            <SheetTextInput
              value={name}
              onChangeText={setName}
              placeholder="Grilled chicken salad"
              placeholderTextColor={theme.outline}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Quantity (g)
            </ThemedText>
            <SheetTextInput
              value={quantityG}
              onChangeText={setQuantityG}
              placeholder="250"
              placeholderTextColor={theme.outline}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Calories (kcal)
            </ThemedText>
            <SheetTextInput
              value={calories}
              onChangeText={setCalories}
              placeholder="540"
              placeholderTextColor={theme.outline}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          <View style={styles.macroRow}>
            <View style={[styles.field, styles.macroField]}>
              <ThemedText type="labelLg" themeColor="textSecondary">
                Carbs (g)
              </ThemedText>
              <SheetTextInput
                value={carbsG}
                onChangeText={setCarbsG}
                placeholder="0"
                placeholderTextColor={theme.outline}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={[styles.field, styles.macroField]}>
              <ThemedText type="labelLg" themeColor="textSecondary">
                Protein (g)
              </ThemedText>
              <SheetTextInput
                value={proteinG}
                onChangeText={setProteinG}
                placeholder="0"
                placeholderTextColor={theme.outline}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={[styles.field, styles.macroField]}>
              <ThemedText type="labelLg" themeColor="textSecondary">
                Fat (g)
              </ThemedText>
              <SheetTextInput
                value={fatG}
                onChangeText={setFatG}
                placeholder="0"
                placeholderTextColor={theme.outline}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>
          </View>

          {error ? (
            <ThemedText type="bodyMd" themeColor="error">
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.primary },
              Shadows.soft,
              (pressed || submitting) && styles.pressed,
            ]}>
            <ThemedText type="labelLg" style={{ color: theme.onPrimary }}>
              {submitting ? 'Saving…' : 'Add entry'}
            </ThemedText>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.one,
  },
  mealRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  mealOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radii.full,
  },
  field: {
    gap: Spacing.two,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  macroField: {
    flex: 1,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  pressed: {
    opacity: 0.8,
  },
});
