import { SymbolView } from 'expo-symbols';
import { useRef, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFoodEntrySheet, type AddFoodEntrySheetRef, type MealType } from '@/components/add-food-entry-sheet';
import { MealDetailSheet, type MealDetailSheetRef } from '@/components/meal-detail-sheet';
import { ProgressRing } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import {
  BeVietnamPro,
  BottomTabInset,
  MaxContentWidth,
  Radii,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useNutritionTracker } from '@/hooks/use-nutrition-tracker';
import { useWaterTracker } from '@/hooks/use-water-tracker';

type Macro = { label: string; value: number; goal: number; unit: string };

const CALORIES_BURNED = 180;

type MealConfig = { name: string; mealType: MealType; icon: string; goal: number; note?: string };

const MEAL_CONFIG: MealConfig[] = [
  { name: 'Breakfast', mealType: 'breakfast', icon: '☕', goal: 500, note: 'Oatmeal with berries' },
  { name: 'Lunch', mealType: 'lunch', icon: '🥗', goal: 650, note: 'Grilled chicken salad' },
  { name: 'Dinner', mealType: 'dinner', icon: '⏳', goal: 650 },
  { name: 'Snacks', mealType: 'snack', icon: '⏳', goal: 200 },
];

const WATER_COLUMNS = 6;
const WATER_CELL_COUNT = 12;
const WATER_ROWS = Array.from({ length: Math.ceil(WATER_CELL_COUNT / WATER_COLUMNS) }, (_, row) =>
  Array.from({ length: WATER_COLUMNS }, (_, col) => row * WATER_COLUMNS + col)
);

export default function DiaryScreen() {
  const theme = useTheme();
  const addFoodSheetRef = useRef<AddFoodEntrySheetRef>(null);
  const mealDetailSheetRef = useRef<MealDetailSheetRef>(null);
  const nutrition = useNutritionTracker();
  const caloriesRemaining = Math.max(
    0,
    nutrition.calorieGoal - nutrition.caloriesEaten + CALORIES_BURNED
  );
  const macros: Macro[] = [
    { label: 'Carbs', value: nutrition.carbs.value, goal: nutrition.carbs.goal, unit: 'g' },
    { label: 'Protein', value: nutrition.protein.value, goal: nutrition.protein.goal, unit: 'g' },
    { label: 'Fat', value: nutrition.fat.value, goal: nutrition.fat.goal, unit: 'g' },
  ];
  const meals = MEAL_CONFIG.map((meal) => ({
    ...meal,
    eaten: nutrition.mealTotals[meal.mealType],
  }));
  const { goalMl, consumedMl, addWater } = useWaterTracker();
  const waterCellMl = Math.max(1, Math.round(goalMl / WATER_CELL_COUNT));
  const waterFilledCount = Math.min(
    WATER_CELL_COUNT,
    Math.round((consumedMl / goalMl) * WATER_CELL_COUNT)
  );
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

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
          <Header />

          <Section title="Overview" actionLabel="Details">
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surfaceContainerLowest },
                Shadows.soft,
              ]}>
              <View style={styles.overviewRow}>
                <OverviewStat value={String(nutrition.caloriesEaten)} label="Eaten" />

                <ProgressRing
                  size={128}
                  strokeWidth={8}
                  progress={nutrition.caloriesEaten / (nutrition.calorieGoal + CALORIES_BURNED)}
                  trackColor={theme.surfaceContainerHighest}
                  progressColor={theme.secondaryFixedDim}>
                  <ThemedText style={styles.ringValue}>{caloriesRemaining}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Remaining
                  </ThemedText>
                </ProgressRing>

                <OverviewStat value={String(CALORIES_BURNED)} label="Burned" />
              </View>

              <View style={styles.macrosRow}>
                {macros.map((macro) => (
                  <MacroBar key={macro.label} macro={macro} />
                ))}
              </View>

              <Pressable
                onPress={() => addFoodSheetRef.current?.present()}
                style={({ pressed }) => [
                  styles.ctaBanner,
                  { backgroundColor: theme.secondaryContainer },
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.ctaEmoji}>🦊</ThemedText>
                <ThemedText type="labelLg" themeColor="secondary">
                  Now: Log food
                </ThemedText>
              </Pressable>
            </View>
          </Section>

          <Section title="Nutrition" actionLabel="More">
            <View
              style={[
                styles.card,
                styles.cardNoPadding,
                { backgroundColor: theme.surfaceContainerLowest },
                Shadows.soft,
              ]}>
              {meals.map((meal, index) => (
                <MealRow
                  key={meal.name}
                  meal={meal}
                  isLast={index === meals.length - 1}
                  onPress={() => mealDetailSheetRef.current?.present(meal)}
                  onAdd={() => addFoodSheetRef.current?.present(meal.mealType)}
                />
              ))}
            </View>
          </Section>

          <Section title="Water">
            <View
              style={[
                styles.card,
                styles.waterCard,
                { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
                Shadows.soft,
              ]}>
              <ThemedText type="headlineMd">Water</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.waterGoal}>
                Goal: {(goalMl / 1000).toFixed(2)} liters
              </ThemedText>
              <ThemedText type="displayLg" style={styles.waterValue}>
                {(consumedMl / 1000).toFixed(2)} L
              </ThemedText>

              <View style={styles.waterGrid}>
                {WATER_ROWS.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.waterRow}>
                    {row.map((index) => (
                      <WaterGlass
                        key={index}
                        filled={index < waterFilledCount}
                        showCheck={index === waterFilledCount - 1}
                        showAdd={index === waterFilledCount}
                        onPress={() => addWater(waterCellMl)}
                      />
                    ))}
                  </View>
                ))}
              </View>

              <View style={[styles.waterFooter, { borderTopColor: theme.outlineVariant }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Tap a glass to log {waterCellMl} ml
                </ThemedText>
              </View>
            </View>
          </Section>

          <Section title="Physical activity" actionLabel="More">
            <View
              style={[
                styles.card,
                styles.activityCard,
                { backgroundColor: theme.surfaceContainerLowest },
                Shadows.soft,
              ]}>
              <ThemedText type="headlineMd" style={styles.activityTitle}>
                Step count
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.activitySubtitle}>
                Automatic tracking
              </ThemedText>

              <Pressable
                style={({ pressed }) => [
                  styles.connectButton,
                  { backgroundColor: theme.text },
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={[styles.connectButtonText, { color: theme.background }]}>
                  Connect
                </ThemedText>
              </Pressable>

              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="labelLg" themeColor="secondary">
                  Log steps manually
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.activityMiniRow}>
              <View style={styles.activityMiniColumn}>
                <Pressable
                  style={({ pressed }) => [
                    styles.activityMiniCard,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                    },
                    Shadows.soft,
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView
                    name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }}
                    size={32}
                    tintColor={theme.text}
                  />
                </Pressable>
                <ThemedText type="small">Add</ThemedText>
              </View>

              <View style={styles.activityMiniColumn}>
                <View
                  style={[
                    styles.activityMiniCard,
                    {
                      backgroundColor: theme.surfaceContainerLowest,
                      borderColor: theme.outlineVariant,
                    },
                    Shadows.soft,
                  ]}>
                  <ThemedText style={styles.activityMiniEmoji}>🏃</ThemedText>
                </View>
                <ThemedText type="small">410 kcal</ThemedText>
              </View>
            </View>
          </Section>
        </View>
      </ScrollView>

      <Pressable
        onPress={() => addFoodSheetRef.current?.present()}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, bottom: insets.bottom },
          Shadows.float,
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={26}
          tintColor={theme.onPrimary}
        />
      </Pressable>

      <AddFoodEntrySheet ref={addFoodSheetRef} onEntryAdded={nutrition.refresh} />
      <MealDetailSheet ref={mealDetailSheetRef} onEntryRemoved={nutrition.refresh} />
    </View>
  );
}

function Header() {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View>
        <ThemedText type="headlineLgMobile">Today</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Week 32
        </ThemedText>
      </View>

      <View style={styles.headerActions}>
        <View style={[styles.streakPill, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView
            name={{
              ios: 'flame.fill',
              android: 'local_fire_department',
              web: 'local_fire_department',
            }}
            size={18}
            tintColor={theme.tertiary}
          />
          <ThemedText type="labelLg" themeColor="tertiary">
            10
          </ThemedText>
        </View>

        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            size={22}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

function Section({
  title,
  actionLabel,
  children,
}: {
  title: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="headlineMd">{title}</ThemedText>
        {actionLabel ? (
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="labelLg" themeColor="primary">
              {actionLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function OverviewStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.overviewStat}>
      <ThemedText type="headlineMd">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function MacroBar({ macro }: { macro: Macro }) {
  const theme = useTheme();
  const progress = Math.min(1, macro.value / macro.goal);

  return (
    <View style={styles.macroBar}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.macroLabel}>
        {macro.label}
      </ThemedText>
      <View style={[styles.macroTrack, { backgroundColor: theme.surfaceContainerHighest }]}>
        <View
          style={[
            styles.macroFill,
            { backgroundColor: theme.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>
      <ThemedText type="labelMd" style={styles.macroLabel}>
        {macro.value} / {macro.goal} {macro.unit}
      </ThemedText>
    </View>
  );
}

function MealRow({
  meal,
  isLast,
  onPress,
  onAdd,
}: {
  meal: MealConfig & { eaten: number };
  isLast: boolean;
  onPress: () => void;
  onAdd: () => void;
}) {
  const theme = useTheme();
  const isLogged = meal.eaten > 0;
  const progress = meal.goal > 0 ? meal.eaten / meal.goal : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.mealRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.outlineVariant },
        pressed && styles.pressed,
      ]}>
      <ProgressRing
        size={56}
        strokeWidth={5}
        progress={progress}
        trackColor={theme.surfaceContainerHighest}
        progressColor={theme.secondaryFixedDim}>
        <ThemedText style={styles.mealEmoji}>{meal.icon}</ThemedText>
      </ProgressRing>

      <View style={styles.mealInfo}>
        <ThemedText type="bodyLg" style={styles.mealName}>
          {meal.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meal.eaten} / {meal.goal} Cal
        </ThemedText>
        {meal.note ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {meal.note}
          </ThemedText>
        ) : null}
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onAdd();
        }}
        style={({ pressed }) => [
          styles.mealAddButton,
          {
            backgroundColor: isLogged ? theme.primary : theme.surfaceContainerHighest,
          },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={16}
          tintColor={isLogged ? theme.onPrimary : theme.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
}

function WaterGlass({
  filled,
  showCheck,
  showAdd,
  onPress,
}: {
  filled: boolean;
  showCheck: boolean;
  showAdd: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.waterGlass,
        filled
          ? { backgroundColor: theme.primaryContainer }
          : {
              backgroundColor: theme.surfaceContainerLow,
              borderWidth: 2,
              borderColor: theme.surfaceContainerHighest,
            },
        pressed && styles.pressed,
      ]}>
      {showCheck ? (
        <View style={[styles.waterGlassBadge, { backgroundColor: theme.secondary }]}>
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={12}
            tintColor={theme.onSecondary}
          />
        </View>
      ) : null}
      {showAdd ? (
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={16}
          tintColor={theme.outline}
        />
      ) : null}
    </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.half,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.full,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.three,
  },
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.four,
  },
  cardNoPadding: {
    padding: 0,
    overflow: 'hidden',
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  ringValue: {
    fontFamily: BeVietnamPro.extraBold,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  macroBar: {
    flex: 1,
    gap: Spacing.one,
  },
  macroLabel: {
    textAlign: 'center',
  },
  macroTrack: {
    height: 8,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  ctaBanner: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radii.full,
  },
  ctaEmoji: {
    fontSize: 16,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  mealEmoji: {
    fontSize: 22,
  },
  mealInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  mealName: {
    fontFamily: BeVietnamPro.bold,
    fontWeight: '700',
  },
  mealAddButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterCard: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  waterGoal: {
    marginTop: Spacing.half,
  },
  waterValue: {
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  waterGrid: {
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
  waterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  waterGlass: {
    width: 36,
    height: 46,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterGlassBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterFooter: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    alignItems: 'center',
  },
  activityCard: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  activityTitle: {
    marginBottom: Spacing.half,
  },
  activitySubtitle: {
    marginBottom: Spacing.four,
  },
  connectButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Radii.xl,
    marginBottom: Spacing.three,
  },
  connectButtonText: {
    fontFamily: BeVietnamPro.bold,
    fontWeight: '700',
    fontSize: 16,
  },
  activityMiniRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  activityMiniColumn: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  activityMiniCard: {
    width: 80,
    height: 96,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityMiniEmoji: {
    fontSize: 28,
  },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
