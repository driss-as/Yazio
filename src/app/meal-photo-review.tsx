import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MealType } from '@/components/add-food-entry-sheet';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { getMealPhotoUrl } from '@/lib/meal-photos';
import { supabase } from '@/lib/supabase';

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

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
];

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export default function MealPhotoReviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { photoPath, logId } = useLocalSearchParams<{ photoPath: string; logId?: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(!!logId);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [premiumRequired, setPremiumRequired] = useState(false);

  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [name, setName] = useState('');
  const [quantityG, setQuantityG] = useState('');
  const [calories, setCalories] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [fatG, setFatG] = useState('');
  const [confidenceNote, setConfidenceNote] = useState<string | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!photoPath) return;
    let cancelled = false;
    getMealPhotoUrl(photoPath).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  useEffect(() => {
    if (!logId) return;
    let cancelled = false;
    supabase
      .from('food_logs')
      .select('name, meal_type, quantity_g, calories, carbs_g, protein_g, fat_g')
      .eq('id', logId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMealType(data.meal_type as MealType);
        setName(data.name);
        setQuantityG(String(data.quantity_g));
        setCalories(String(data.calories));
        setCarbsG(String(data.carbs_g));
        setProteinG(String(data.protein_g));
        setFatG(String(data.fat_g));
        setLoadingEntry(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logId]);

  async function handleAnalyze() {
    if (!photoPath) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setPremiumRequired(false);

    const { data, error } = await supabase.functions.invoke<{ estimate: NutritionEstimate }>(
      'analyze-meal-photo',
      { body: { photoPath } }
    );

    setAnalyzing(false);

    if (error || !data?.estimate) {
      let code: string | undefined;
      let message = error?.message;

      if (error && 'context' in error && error.context instanceof Response) {
        try {
          const body = await error.context.clone().json();
          code = body?.code;
          message = body?.error ?? message;
        } catch {
          // ignore, fall back to error.message
        }
      }

      if (code === 'premium_required') {
        setPremiumRequired(true);
      } else {
        setAnalyzeError(message ?? 'Could not analyze this photo.');
      }
      return;
    }

    const estimate = data.estimate;
    setName(estimate.dish_name);
    setQuantityG(String(estimate.estimated_quantity_g));
    setCalories(String(Math.round(estimate.calories)));
    setCarbsG(String(Math.round(estimate.carbs_g)));
    setProteinG(String(Math.round(estimate.protein_g)));
    setFatG(String(Math.round(estimate.fat_g)));
    setConfidenceNote(
      estimate.notes || `Estimated with ${estimate.confidence} confidence — feel free to adjust.`
    );
  }

  async function handleSave() {
    const userId = session?.user.id;
    if (!userId) {
      setSaveError('You must be signed in.');
      return;
    }

    const quantity = parseNumber(quantityG);
    const caloriesValue = parseNumber(calories);

    if (!name.trim()) {
      setSaveError('Enter a food name.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setSaveError('Enter a valid quantity in grams.');
      return;
    }
    if (Number.isNaN(caloriesValue) || caloriesValue < 0) {
      setSaveError('Enter valid calories.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const entry = {
      meal_type: mealType,
      name: name.trim(),
      quantity_g: quantity,
      calories: caloriesValue,
      carbs_g: parseNumber(carbsG) || 0,
      protein_g: parseNumber(proteinG) || 0,
      fat_g: parseNumber(fatG) || 0,
    };

    const { error } = logId
      ? await supabase.from('food_logs').update(entry).eq('id', logId)
      : await supabase.from('food_logs').insert({
          ...entry,
          user_id: userId,
          logged_date: todayIso(),
          photo_path: photoPath,
        });

    setSaving(false);

    if (error) {
      setSaveError(error.message);
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
            <ThemedText type="headlineLgMobile">Meal photo</ThemedText>
          </View>

          {url ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: url }} style={styles.image} contentFit="cover" />
              {analyzing ? <MagicScanOverlay tint={theme.primary} /> : null}
            </View>
          ) : (
            <ThemedText type="bodyMd" themeColor="textSecondary">
              Loading photo…
            </ThemedText>
          )}

          <Pressable
            onPress={handleAnalyze}
            disabled={analyzing || !url}
            style={({ pressed }) => [
              styles.analyzeButton,
              { backgroundColor: theme.primary },
              Shadows.soft,
              (pressed || analyzing || !url) && styles.pressed,
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
              {analyzing ? 'Analyzing…' : 'Analyze nutrition'}
            </ThemedText>
          </Pressable>

          {premiumRequired ? (
            <View
              style={[
                styles.card,
                styles.premiumCard,
                { backgroundColor: theme.primaryContainer },
              ]}>
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                size={20}
                tintColor={theme.onPrimaryContainer}
              />
              <ThemedText
                type="bodyMd"
                style={[styles.premiumCardText, { color: theme.onPrimaryContainer }]}>
                L’analyse IA des photos est une fonctionnalité Premium.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/premium')}
                style={({ pressed }) => [
                  styles.premiumCardButton,
                  { backgroundColor: theme.primary },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="labelLg" style={{ color: theme.onPrimary }}>
                  Passer Premium
                </ThemedText>
              </Pressable>
            </View>
          ) : null}

          {analyzeError ? (
            <ThemedText type="bodyMd" themeColor="error">
              {analyzeError}
            </ThemedText>
          ) : null}

          {loadingEntry ? (
            <ThemedText type="bodyMd" themeColor="textSecondary">
              Loading entry…
            </ThemedText>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
                Shadows.soft,
              ]}>
              {confidenceNote ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {confidenceNote}
                </ThemedText>
              ) : null}

              <View style={styles.mealRow}>
                {MEAL_OPTIONS.map((option) => {
                  const selected = option.value === mealType;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setMealType(option.value)}
                      style={[
                        styles.mealOption,
                        { backgroundColor: selected ? theme.primary : theme.backgroundElement },
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

              <Field label="Food name" value={name} onChangeText={setName} theme={theme} />
              <Field
                label="Quantity (g)"
                value={quantityG}
                onChangeText={setQuantityG}
                keyboardType="decimal-pad"
                theme={theme}
              />
              <Field
                label="Calories (kcal)"
                value={calories}
                onChangeText={setCalories}
                keyboardType="decimal-pad"
                theme={theme}
              />

              <View style={styles.macroRow}>
                <View style={styles.macroField}>
                  <Field
                    label="Carbs (g)"
                    value={carbsG}
                    onChangeText={setCarbsG}
                    keyboardType="decimal-pad"
                    theme={theme}
                  />
                </View>
                <View style={styles.macroField}>
                  <Field
                    label="Protein (g)"
                    value={proteinG}
                    onChangeText={setProteinG}
                    keyboardType="decimal-pad"
                    theme={theme}
                  />
                </View>
                <View style={styles.macroField}>
                  <Field
                    label="Fat (g)"
                    value={fatG}
                    onChangeText={setFatG}
                    keyboardType="decimal-pad"
                    theme={theme}
                  />
                </View>
              </View>

              {saveError ? (
                <ThemedText type="bodyMd" themeColor="error">
                  {saveError}
                </ThemedText>
              ) : null}

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                  Shadows.soft,
                  (pressed || saving) && styles.pressed,
                ]}>
                <ThemedText type="labelLg" style={{ color: theme.onPrimary }}>
                  {saving ? 'Saving…' : 'Save'}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const SPARKLE_POSITIONS: { top: `${number}%`; left: `${number}%` }[] = [
  { top: '15%', left: '18%' },
  { top: '62%', left: '72%' },
  { top: '38%', left: '52%' },
  { top: '78%', left: '22%' },
  { top: '22%', left: '78%' },
];

function MagicScanOverlay({ tint }: { tint: string }) {
  const scanY = useSharedValue(-12);
  const shimmerX = useSharedValue(-60);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(112, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    shimmerX.value = withRepeat(withTiming(140, { duration: 2200, easing: Easing.linear }), -1, false);
    glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [scanY, shimmerX, glow]);

  const scanLineStyle = useAnimatedStyle(() => ({ top: `${scanY.value}%` }));
  const shimmerStyle = useAnimatedStyle(() => ({ left: `${shimmerX.value}%` }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={styles.magicOverlay} pointerEvents="none">
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.shimmerBand, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.scanLine, scanLineStyle]}>
        <LinearGradient
          colors={['transparent', tint, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.magicBorder, { borderColor: tint }, glowStyle]} />

      {SPARKLE_POSITIONS.map((position, index) => (
        <Sparkle key={index} position={position} delay={index * 260} color={tint} />
      ))}

      <View style={styles.magicLabel}>
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          size={16}
          tintColor="#fff"
        />
        <ThemedText type="labelLg" style={styles.magicLabelText}>
          Analyse magique en cours…
        </ThemedText>
      </View>
    </View>
  );
}

function Sparkle({
  position,
  delay,
  color,
}: {
  position: { top: `${number}%`; left: `${number}%` };
  delay: number;
  color: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1, false)
    );
  }, [progress, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.6 }],
  }));

  return (
    <Animated.View style={[styles.sparkle, position, style]}>
      <SymbolView
        name={{ ios: 'sparkle', android: 'auto_awesome', web: 'auto_awesome' }}
        size={14}
        tintColor={color}
      />
    </Animated.View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  theme,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'decimal-pad';
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="labelLg" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={theme.outline}
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
        ]}
      />
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
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
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
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  magicOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: '-40%',
    width: '55%',
    height: '180%',
    transform: [{ rotate: '-20deg' }],
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
  },
  magicBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: Radii.lg,
  },
  sparkle: {
    position: 'absolute',
  },
  magicLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginBottom: Spacing.three,
  },
  magicLabelText: {
    color: '#fff',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  premiumCard: {
    borderWidth: 0,
    alignItems: 'center',
  },
  premiumCardText: {
    textAlign: 'center',
  },
  premiumCardButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
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
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    marginTop: Spacing.one,
  },
});
