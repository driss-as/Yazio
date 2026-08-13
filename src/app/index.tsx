import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

type Macro = { label: string; value: number; goal: number; unit: string };

const CALORIE_GOAL = 2000;
const CALORIES_EATEN = 1240;
const CALORIES_BURNED = 180;
const CALORIES_REMAINING = Math.max(0, CALORIE_GOAL - CALORIES_EATEN + CALORIES_BURNED);

const MACROS: Macro[] = [
  { label: 'Carbs', value: 118, goal: 230, unit: 'g' },
  { label: 'Protein', value: 54, goal: 115, unit: 'g' },
  { label: 'Fat', value: 38, goal: 65, unit: 'g' },
];

type Meal = { name: string; icon: string; eaten: number; goal: number; note?: string };

const MEALS: Meal[] = [
  { name: 'Breakfast', icon: '☕', eaten: 320, goal: 500, note: 'Oatmeal with berries' },
  { name: 'Lunch', icon: '🥗', eaten: 540, goal: 650, note: 'Grilled chicken salad' },
  { name: 'Dinner', icon: '⏳', eaten: 0, goal: 650 },
  { name: 'Snacks', icon: '⏳', eaten: 0, goal: 200 },
];

const WATER_GOAL_LITERS = 2.5;
const WATER_LITERS = 1.8;
const WATER_COLUMNS = 6;
const WATER_CELL_COUNT = 12;
const WATER_FILLED_COUNT = Math.round((WATER_LITERS / WATER_GOAL_LITERS) * WATER_CELL_COUNT);
const WATER_ROWS = Array.from({ length: Math.ceil(WATER_CELL_COUNT / WATER_COLUMNS) }, (_, row) =>
  Array.from({ length: WATER_COLUMNS }, (_, col) => row * WATER_COLUMNS + col)
);

export default function DiaryScreen() {
  const theme = useTheme();
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
                <OverviewStat value={String(CALORIES_EATEN)} label="Eaten" />

                <ProgressRing
                  size={128}
                  strokeWidth={8}
                  progress={CALORIES_EATEN / (CALORIE_GOAL + CALORIES_BURNED)}
                  trackColor={theme.surfaceContainerHighest}
                  progressColor={theme.secondaryFixedDim}>
                  <ThemedText style={styles.ringValue}>{CALORIES_REMAINING}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Remaining
                  </ThemedText>
                </ProgressRing>

                <OverviewStat value={String(CALORIES_BURNED)} label="Burned" />
              </View>

              <View style={styles.macrosRow}>
                {MACROS.map((macro) => (
                  <MacroBar key={macro.label} macro={macro} />
                ))}
              </View>

              <Pressable
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
              {MEALS.map((meal, index) => (
                <MealRow key={meal.name} meal={meal} isLast={index === MEALS.length - 1} />
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
                Goal: {WATER_GOAL_LITERS.toFixed(2)} liters
              </ThemedText>
              <ThemedText type="displayLg" style={styles.waterValue}>
                {WATER_LITERS.toFixed(2)} L
              </ThemedText>

              <View style={styles.waterGrid}>
                {WATER_ROWS.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.waterRow}>
                    {row.map((index) => (
                      <WaterGlass
                        key={index}
                        filled={index < WATER_FILLED_COUNT}
                        showCheck={index === WATER_FILLED_COUNT - 1}
                        showAdd={index === WATER_FILLED_COUNT}
                      />
                    ))}
                  </View>
                ))}
              </View>

              <View style={[styles.waterFooter, { borderTopColor: theme.outlineVariant }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  + Water from food: 120 ml
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

function MealRow({ meal, isLast }: { meal: Meal; isLast: boolean }) {
  const theme = useTheme();
  const isLogged = meal.eaten > 0;
  const progress = meal.goal > 0 ? meal.eaten / meal.goal : 0;

  return (
    <View
      style={[
        styles.mealRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.outlineVariant },
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
    </View>
  );
}

function WaterGlass({
  filled,
  showCheck,
  showAdd,
}: {
  filled: boolean;
  showCheck: boolean;
  showAdd: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.waterGlass,
        filled
          ? { backgroundColor: theme.primaryContainer }
          : {
              backgroundColor: theme.surfaceContainerLow,
              borderWidth: 2,
              borderColor: theme.surfaceContainerHighest,
            },
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
