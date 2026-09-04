import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { Image } from 'expo-image';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealPhotoDetailSheet, type MealPhotoDetailSheetRef } from '@/components/meal-photo-detail-sheet';
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
import { useAuth } from '@/context/auth-context';
import { useBodyMetrics } from '@/hooks/use-body-metrics';
import { useMealPhotos } from '@/hooks/use-meal-photos';
import { usePremiumStatus } from '@/hooks/use-premium-status';
import { useTheme } from '@/hooks/use-theme';

type Stat = { label: string; value: string; unit?: string };

type SettingsItem = { label: string; icon: SymbolViewProps['name']; onPress?: () => void };

const ACCOUNT_ITEMS: SettingsItem[] = [
  {
    label: 'Personal details',
    icon: { ios: 'person.text.rectangle', android: 'badge', web: 'badge' },
    onPress: () => router.push('/personal-details'),
  },
  {
    label: 'Goals & nutrition',
    icon: { ios: 'target', android: 'track_changes', web: 'track_changes' },
    onPress: () => router.push('/goals-nutrition'),
  },
  { label: 'Units & measurements', icon: { ios: 'ruler', android: 'straighten', web: 'straighten' } },
];

const APP_ITEMS: SettingsItem[] = [
  {
    label: 'Notifications',
    icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
  },
  {
    label: 'App preferences',
    icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
  },
  {
    label: 'Privacy & data',
    icon: { ios: 'lock', android: 'lock', web: 'lock' },
  },
  {
    label: 'Help & support',
    icon: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const metrics = useBodyMetrics();
  const { photos, loading: photosLoading, refresh: refreshPhotos } = useMealPhotos();
  const premium = usePremiumStatus();
  const photoDetailSheetRef = useRef<MealPhotoDetailSheetRef>(null);

  useFocusEffect(
    useCallback(() => {
      refreshPhotos();
      premium.refresh();
    }, [refreshPhotos, premium.refresh])
  );
  const bmi = metrics.currentWeightKg / (metrics.heightCm / 100) ** 2;
  const weightProgress = Math.min(
    1,
    Math.max(
      0,
      (metrics.startWeightKg - metrics.currentWeightKg) /
        (metrics.startWeightKg - metrics.targetWeightKg)
    )
  );
  const stats: Stat[] = [
    { label: 'Height', value: metrics.heightCm.toString(), unit: 'cm' },
    { label: 'Weight', value: metrics.currentWeightKg.toFixed(1), unit: 'kg' },
    { label: 'Target', value: metrics.targetWeightKg.toString(), unit: 'kg' },
    { label: 'BMI', value: bmi.toFixed(1) },
  ];
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

          <PremiumBanner isPremium={premium.isPremium} />

          <Section title="Goals">
            <View
              style={[
                styles.card,
                styles.weightCard,
                { backgroundColor: theme.surfaceContainerLowest },
                Shadows.soft,
              ]}>
              <ProgressRing
                size={104}
                strokeWidth={8}
                progress={weightProgress}
                trackColor={theme.surfaceContainerHighest}
                progressColor={theme.primary}>
                <ThemedText style={styles.ringValue}>
                  {Math.round(weightProgress * 100)}%
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  to goal
                </ThemedText>
              </ProgressRing>

              <View style={styles.weightInfo}>
                <ThemedText type="headlineMd">Weight goal</ThemedText>
                <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.weightSubtitle}>
                  {metrics.currentWeightKg.toFixed(1)} kg now · {metrics.targetWeightKg} kg target
                </ThemedText>

                <View style={[styles.weightTrack, { backgroundColor: theme.surfaceContainerHighest }]}>
                  <View
                    style={[
                      styles.weightFill,
                      { backgroundColor: theme.primary, width: `${weightProgress * 100}%` },
                    ]}
                  />
                </View>

                <View style={styles.weightRange}>
                  <ThemedText type="labelMd" themeColor="textSecondary">
                    Start {metrics.startWeightKg} kg
                  </ThemedText>
                  <ThemedText type="labelMd" themeColor="textSecondary">
                    Goal {metrics.targetWeightKg} kg
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              {stats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </View>
          </Section>

          <Section title="Meal photos">
            {photosLoading ? (
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Loading…
              </ThemedText>
            ) : photos.length === 0 ? (
              <View
                style={[
                  styles.card,
                  styles.photosEmpty,
                  { backgroundColor: theme.surfaceContainerLowest },
                  Shadows.soft,
                ]}>
                <SymbolView
                  name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
                  size={24}
                  tintColor={theme.textSecondary}
                />
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  Photos you add when logging food will show up here.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.photosGrid}>
                {photos.map((photo) => (
                  <Pressable
                    key={photo.photo_path}
                    onPress={() => photoDetailSheetRef.current?.present(photo)}
                    style={({ pressed }) => [styles.photoTile, pressed && styles.pressed]}>
                    <Image source={{ uri: photo.url }} style={styles.photoTileImage} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            )}
          </Section>

          <Section title="Account">
            <View
              style={[
                styles.card,
                styles.cardNoPadding,
                { backgroundColor: theme.surfaceContainerLowest },
                Shadows.soft,
              ]}>
              {ACCOUNT_ITEMS.map((item, index) => (
                <SettingsRow key={item.label} item={item} isLast={index === ACCOUNT_ITEMS.length - 1} />
              ))}
            </View>
          </Section>

          <Section title="Preferences">
            <View
              style={[
                styles.card,
                styles.cardNoPadding,
                { backgroundColor: theme.surfaceContainerLowest },
                Shadows.soft,
              ]}>
              {APP_ITEMS.map((item, index) => (
                <SettingsRow key={item.label} item={item} isLast={index === APP_ITEMS.length - 1} />
              ))}
            </View>
          </Section>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.logoutButton,
              { borderColor: theme.error },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
              size={18}
              tintColor={theme.error}
            />
            <ThemedText type="labelLg" themeColor="error">
              Log out
            </ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
            yazio v1.0.0
          </ThemedText>
        </View>
      </ScrollView>

      <MealPhotoDetailSheet ref={photoDetailSheetRef} onUpdated={refreshPhotos} />
    </View>
  );
}

function Header() {
  const theme = useTheme();
  const { session } = useAuth();
  const email = session?.user.email ?? '';
  const displayName = email.split('@')[0] || 'Account';
  const initials = (email[0] ?? '?').toUpperCase();

  return (
    <View style={styles.header}>
      <View style={[styles.avatar, { backgroundColor: theme.primaryContainer }]}>
        <ThemedText style={[styles.avatarText, { color: theme.onPrimaryContainer }]}>
          {initials}
        </ThemedText>
      </View>

      <View style={styles.headerInfo}>
        <ThemedText type="headlineLgMobile">{displayName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {email}
        </ThemedText>
      </View>

      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <SymbolView
          name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          size={20}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

function PremiumBanner({ isPremium }: { isPremium: boolean }) {
  const theme = useTheme();

  if (isPremium) {
    return (
      <Pressable
        onPress={() => router.push('/premium')}
        style={({ pressed }) => [
          styles.premiumBanner,
          { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant, borderWidth: StyleSheet.hairlineWidth },
          Shadows.soft,
          pressed && styles.pressed,
        ]}>
        <View style={[styles.premiumIcon, { backgroundColor: theme.primary }]}>
          <SymbolView
            name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
            size={18}
            tintColor={theme.onPrimary}
          />
        </View>

        <View style={styles.premiumInfo}>
          <View style={styles.premiumActiveTitleRow}>
            <ThemedText type="labelLg">Yazio Premium</ThemedText>
            <View style={[styles.premiumBadge, { backgroundColor: theme.primaryContainer }]}>
              <ThemedText type="small" style={{ color: theme.onPrimaryContainer }}>
                Actif
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Merci de votre soutien — gérer mon abonnement
          </ThemedText>
        </View>

        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={16}
          tintColor={theme.outline}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/premium')}
      style={({ pressed }) => [
        styles.premiumBanner,
        { backgroundColor: theme.primaryContainer },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.premiumIcon, { backgroundColor: theme.primary }]}>
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          size={18}
          tintColor={theme.onPrimary}
        />
      </View>

      <View style={styles.premiumInfo}>
        <ThemedText type="labelLg" style={{ color: theme.onPrimaryContainer }}>
          Passer Premium
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.onPrimaryContainer }}>
          Débloquez toutes les fonctionnalités de yazio
        </ThemedText>
      </View>

      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={16}
        tintColor={theme.onPrimaryContainer}
      />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="headlineMd">{title}</ThemedText>
      </View>
      {children}
    </View>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
        Shadows.soft,
      ]}>
      <ThemedText type="headlineMd">
        {stat.value}
        {stat.unit ? (
          <ThemedText type="labelMd" themeColor="textSecondary">
            {' '}
            {stat.unit}
          </ThemedText>
        ) : null}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {stat.label}
      </ThemedText>
    </View>
  );
}

function SettingsRow({ item, isLast }: { item: SettingsItem; isLast: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.outlineVariant },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.settingsIcon, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView name={item.icon} size={18} tintColor={theme.text} />
      </View>

      <ThemedText type="bodyLg" style={styles.settingsLabel}>
        {item.label}
      </ThemedText>

      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={16}
        tintColor={theme.outline}
      />
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
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: BeVietnamPro.bold,
    fontWeight: '700',
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radii.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  premiumIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  premiumActiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  premiumBadge: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeader: {
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
  weightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  ringValue: {
    fontFamily: BeVietnamPro.extraBold,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  weightInfo: {
    flex: 1,
  },
  weightSubtitle: {
    marginTop: Spacing.half,
    marginBottom: Spacing.three,
  },
  weightTrack: {
    height: 8,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  weightFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  weightRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  photosEmpty: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photoTile: {
    flexBasis: '31%',
    flexGrow: 1,
    aspectRatio: 1,
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.md,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.three,
  },
  version: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
});
