import type { Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS: { name: string; href: Href; label: string; icon: SymbolViewProps['name'] }[] = [
  { name: 'index', href: '/', label: 'Diary', icon: { web: 'book' } },
  { name: 'foods', href: '/foods', label: 'Base', icon: { web: 'restaurant' } },
  { name: 'profile', href: '/profile', label: 'Profile', icon: { web: 'person' } },
];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <BottomTabBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </BottomTabBar>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: SymbolViewProps['name'] }) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  return (
    <View {...props} style={styles.tabButton}>
      <SymbolView name={icon} size={22} tintColor={color} />
      <ThemedText type="labelMd" style={{ color }}>
        {children}
      </ThemedText>
    </View>
  );
}

function BottomTabBar(props: { children?: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.barContainer,
        { backgroundColor: theme.surfaceContainerLowest, borderTopColor: theme.outlineVariant },
      ]}>
      <View style={styles.barInner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  barInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  tabButton: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.md,
    cursor: 'pointer',
  },
});
