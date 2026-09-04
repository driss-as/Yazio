import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { usePremiumOffering } from '@/hooks/use-premium-offering';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const FEATURES = [
  'Analyse de repas par photo illimitée',
  'Suivi détaillé des macros et de l’hydratation',
  'Statistiques et tendances sur le long terme',
  'Sans publicité',
];

export default function PremiumScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { supported, plans, loading, error, purchasingKey, purchase } = usePremiumOffering();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const selectedPlan = plans.find((plan) => plan.packageIdentifier === selectedKey) ?? plans[0];

  async function handleSubscribe() {
    if (!selectedPlan) return;

    setFeedback(null);
    const result = await purchase(selectedPlan);

    if (result.cancelled) return;

    if (result.error) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    // Reflect the new entitlement in the dedicated Supabase field right away,
    // instead of waiting for the RevenueCat webhook to land.
    await supabase.functions.invoke('sync-premium-status');

    setFeedback({ type: 'success', message: 'Bienvenue dans Yazio Premium !' });
    setTimeout(() => router.back(), 1200);
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
            <ThemedText type="headlineLgMobile">Passer Premium</ThemedText>
          </View>

          <View style={[styles.hero, { backgroundColor: theme.primaryContainer }]}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
              size={32}
              tintColor={theme.onPrimaryContainer}
            />
            <ThemedText type="headlineMd" style={{ color: theme.onPrimaryContainer }}>
              Yazio Premium
            </ThemedText>
            <ThemedText
              type="bodyMd"
              style={[styles.heroSubtitle, { color: theme.onPrimaryContainer }]}>
              Débloquez toutes les fonctionnalités pour atteindre vos objectifs plus vite.
            </ThemedText>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
              Shadows.soft,
            ]}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <SymbolView
                  name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                  size={18}
                  tintColor={theme.primary}
                />
                <ThemedText type="bodyMd" style={styles.featureLabel}>
                  {feature}
                </ThemedText>
              </View>
            ))}
          </View>

          {!supported ? (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.outlineVariant },
                Shadows.soft,
              ]}>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                L’abonnement Premium se souscrit pour l’instant sur la version web de Yazio. Ouvrez
                yazio.app dans votre navigateur pour vous abonner.
              </ThemedText>
            </View>
          ) : loading ? (
            <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.centeredText}>
              Chargement des tarifs…
            </ThemedText>
          ) : (
            <>
              <View style={styles.plans}>
                {plans.map((plan) => {
                  const isSelected =
                    (selectedKey ?? plans[0]?.packageIdentifier) === plan.packageIdentifier;
                  const isAnnual = plan.packageIdentifier === '$rc_annual';

                  return (
                    <Pressable
                      key={plan.packageIdentifier}
                      onPress={() => setSelectedKey(plan.packageIdentifier)}
                      style={({ pressed }) => [
                        styles.planCard,
                        {
                          backgroundColor: theme.surfaceContainerLowest,
                          borderColor: isSelected ? theme.primary : theme.outlineVariant,
                          borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                        },
                        Shadows.soft,
                        pressed && styles.pressed,
                      ]}>
                      {isAnnual ? (
                        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                          <ThemedText type="small" style={{ color: theme.onPrimary }}>
                            Meilleure offre
                          </ThemedText>
                        </View>
                      ) : null}
                      <ThemedText type="labelLg" themeColor="textSecondary">
                        {plan.title}
                      </ThemedText>
                      <ThemedText type="headlineMd">
                        {plan.priceFormatted}
                        <ThemedText type="labelMd" themeColor="textSecondary">
                          {' '}
                          {plan.periodLabel}
                        </ThemedText>
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {error ? (
                <ThemedText type="bodyMd" themeColor="error" style={styles.centeredText}>
                  {error}
                </ThemedText>
              ) : null}

              {feedback ? (
                <ThemedText
                  type="bodyMd"
                  themeColor={feedback.type === 'error' ? 'error' : 'text'}
                  style={styles.centeredText}>
                  {feedback.message}
                </ThemedText>
              ) : null}

              <Pressable
                onPress={handleSubscribe}
                disabled={!selectedPlan || purchasingKey !== null}
                style={({ pressed }) => [
                  styles.subscribeButton,
                  { backgroundColor: theme.primary },
                  (pressed || purchasingKey !== null || !selectedPlan) && styles.pressed,
                ]}>
                <ThemedText type="labelLg" style={{ color: theme.onPrimary }}>
                  {purchasingKey ? 'Traitement…' : 'S’abonner'}
                </ThemedText>
              </Pressable>
            </>
          )}
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
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
  },
  heroSubtitle: {
    textAlign: 'center',
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  featureLabel: {
    flex: 1,
  },
  centeredText: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  plans: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  planCard: {
    flex: 1,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    marginBottom: Spacing.half,
  },
  subscribeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    marginBottom: Spacing.four,
  },
});
