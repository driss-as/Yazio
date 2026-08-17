import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useNutritionTracker } from '@/hooks/use-nutrition-tracker';
import { useTheme } from '@/hooks/use-theme';

export default function GoalsNutritionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nutrition = useNutritionTracker();

  const [calorieGoal, setCalorieGoal] = useState('');
  const [carbsGoalG, setCarbsGoalG] = useState('');
  const [proteinGoalG, setProteinGoalG] = useState('');
  const [fatGoalG, setFatGoalG] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (nutrition.loading) return;
    setCalorieGoal(nutrition.calorieGoal.toString());
    setCarbsGoalG(nutrition.carbs.goal.toString());
    setProteinGoalG(nutrition.protein.goal.toString());
    setFatGoalG(nutrition.fat.goal.toString());
  }, [nutrition.loading, nutrition.calorieGoal, nutrition.carbs.goal, nutrition.protein.goal, nutrition.fat.goal]);

  function parse(value: string) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  async function handleSave() {
    const calories = parse(calorieGoal);
    const carbs = parse(carbsGoalG);
    const protein = parse(proteinGoalG);
    const fat = parse(fatGoalG);

    if (!calories || calories <= 0) {
      setError('Enter a valid calorie goal.');
      return;
    }
    if (Number.isNaN(carbs) || carbs < 0) {
      setError('Enter a valid carbs goal.');
      return;
    }
    if (Number.isNaN(protein) || protein < 0) {
      setError('Enter a valid protein goal.');
      return;
    }
    if (Number.isNaN(fat) || fat < 0) {
      setError('Enter a valid fat goal.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: saveError } = await nutrition.saveGoals({
      calorieGoal: calories,
      carbsGoalG: carbs,
      proteinGoalG: protein,
      fatGoalG: fat,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    router.back();
  }

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.four,
      paddingBottom: insets.bottom,
    },
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                size={20}
                tintColor={theme.text}
              />
            </Pressable>
            <ThemedText type="headlineLgMobile">Goals & nutrition</ThemedText>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
              Shadows.soft,
            ]}>
            <View style={styles.field}>
              <ThemedText type="labelLg" themeColor="textSecondary">
                Calorie goal (kcal)
              </ThemedText>
              <TextInput
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                placeholder="2000"
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
                <TextInput
                  value={carbsGoalG}
                  onChangeText={setCarbsGoalG}
                  placeholder="230"
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
                <TextInput
                  value={proteinGoalG}
                  onChangeText={setProteinGoalG}
                  placeholder="115"
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
                <TextInput
                  value={fatGoalG}
                  onChangeText={setFatGoalG}
                  placeholder="65"
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
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: theme.primary },
                (pressed || saving) && styles.pressed,
              ]}>
              <ThemedText type="labelLg" style={{ color: theme.onPrimary }}>
                {saving ? 'Saving…' : 'Save'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  page: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.four,
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
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
  },
});
