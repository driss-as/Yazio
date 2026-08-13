import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PlaceholderScreenProps = {
  title: string;
  icon: SymbolViewProps['name'];
  message: string;
};

export function PlaceholderScreen({ title, icon, message }: PlaceholderScreenProps) {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const platformPadding = Platform.select({
    android: {
      paddingTop: safeAreaInsets.top,
      paddingBottom: safeAreaInsets.bottom + BottomTabInset,
    },
    web: { paddingTop: Spacing.four, paddingBottom: BottomTabInset },
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }, platformPadding]}>
      <View style={styles.page}>
        <ThemedText type="headlineLgMobile" style={styles.title}>
          {title}
        </ThemedText>

        <View style={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView name={icon} size={40} tintColor={theme.primary} />
          </View>
          <ThemedText type="headlineMd" style={styles.message}>
            {message}
          </ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.hint}>
            Coming soon
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  title: {
    paddingTop: Spacing.two,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  message: {
    textAlign: 'center',
  },
  hint: {
    textAlign: 'center',
  },
});
