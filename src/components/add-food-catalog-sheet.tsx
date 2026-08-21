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
import type { NewFoodInput } from '@/hooks/use-food-catalog';
import { useTheme } from '@/hooks/use-theme';

// BottomSheetTextInput relies on TextInput.State.currentlyFocusedInput, which
// react-native-web doesn't implement. Fall back to a plain TextInput on web.
const SheetTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

export type AddFoodCatalogSheetRef = {
  present: () => void;
  dismiss: () => void;
};

type AddFoodCatalogSheetProps = {
  onAdd: (input: NewFoodInput) => Promise<{ error: string | null }>;
};

function parseNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export const AddFoodCatalogSheet = forwardRef<AddFoodCatalogSheetRef, AddFoodCatalogSheetProps>(
  function AddFoodCatalogSheet({ onAdd }, ref) {
    const theme = useTheme();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['75%'], []);

    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [calories, setCalories] = useState('');
    const [carbsG, setCarbsG] = useState('');
    const [proteinG, setProteinG] = useState('');
    const [fatG, setFatG] = useState('');
    const [servingG, setServingG] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function reset() {
      setName('');
      setBrand('');
      setCalories('');
      setCarbsG('');
      setProteinG('');
      setFatG('');
      setServingG('');
      setError(null);
      setSubmitting(false);
    }

    useImperativeHandle(ref, () => ({
      present: () => {
        reset();
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
      const caloriesValue = parseNumber(calories);

      if (!name.trim()) {
        setError('Enter a food name.');
        return;
      }
      if (Number.isNaN(caloriesValue) || caloriesValue < 0) {
        setError('Enter valid calories per 100g.');
        return;
      }

      setSubmitting(true);
      setError(null);

      const servingValue = parseNumber(servingG);

      const { error: submitError } = await onAdd({
        name: name.trim(),
        brand: brand.trim(),
        caloriesPer100g: caloriesValue,
        carbsGPer100g: parseNumber(carbsG) || 0,
        proteinGPer100g: parseNumber(proteinG) || 0,
        fatGPer100g: parseNumber(fatG) || 0,
        defaultServingG: !Number.isNaN(servingValue) && servingValue > 0 ? servingValue : null,
      });

      setSubmitting(false);

      if (submitError) {
        setError(submitError);
        return;
      }

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
            Add food
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Values are per 100 g
          </ThemedText>

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Food name
            </ThemedText>
            <SheetTextInput
              value={name}
              onChangeText={setName}
              placeholder="Rolled oats"
              placeholderTextColor={theme.outline}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Brand (optional)
            </ThemedText>
            <SheetTextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="Quaker"
              placeholderTextColor={theme.outline}
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Calories (kcal / 100g)
            </ThemedText>
            <SheetTextInput
              value={calories}
              onChangeText={setCalories}
              placeholder="389"
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

          <View style={styles.field}>
            <ThemedText type="labelLg" themeColor="textSecondary">
              Default serving (g, optional)
            </ThemedText>
            <SheetTextInput
              value={servingG}
              onChangeText={setServingG}
              placeholder="40"
              placeholderTextColor={theme.outline}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
              ]}
            />
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
              {submitting ? 'Saving…' : 'Add to database'}
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
    marginBottom: -Spacing.one,
  },
  subtitle: {
    marginBottom: Spacing.one,
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
