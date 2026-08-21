import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { SymbolView } from 'expo-symbols';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import type { FoodItem } from '@/hooks/use-food-catalog';
import { useTheme } from '@/hooks/use-theme';

export type FoodDetailSheetRef = {
  present: (food: FoodItem) => void;
  dismiss: () => void;
};

type FoodDetailSheetProps = {
  userId: string | undefined;
  onDelete: (id: string) => Promise<void>;
};

export const FoodDetailSheet = forwardRef<FoodDetailSheetRef, FoodDetailSheetProps>(
  function FoodDetailSheet({ userId, onDelete }, ref) {
    const theme = useTheme();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['55%'], []);

    const [food, setFood] = useState<FoodItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    useImperativeHandle(ref, () => ({
      present: (nextFood) => {
        setFood(nextFood);
        setDeleting(false);
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

    async function handleDelete() {
      if (!food) return;
      setDeleting(true);
      await onDelete(food.id);
      setDeleting(false);
      sheetRef.current?.close();
    }

    const canDelete = !!food && !!userId && food.created_by === userId;

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
          {food ? (
            <>
              <View style={styles.header}>
                <View
                  style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
                  <SymbolView
                    name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
                    size={26}
                    tintColor={theme.primary}
                  />
                </View>
                <View style={styles.headerInfo}>
                  <ThemedText type="headlineMd">{food.name}</ThemedText>
                  {food.brand ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {food.brand}
                    </ThemedText>
                  ) : null}
                </View>
              </View>

              <ThemedText type="labelLg" themeColor="textSecondary" style={styles.sectionLabel}>
                Per 100 g
              </ThemedText>

              <View
                style={[
                  styles.statsCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
                ]}>
                <Stat label="Calories" value={`${Math.round(food.calories_per_100g)} kcal`} />
                <Stat label="Carbs" value={`${Math.round(food.carbs_g_per_100g)} g`} />
                <Stat label="Protein" value={`${Math.round(food.protein_g_per_100g)} g`} />
                <Stat label="Fat" value={`${Math.round(food.fat_g_per_100g)} g`} />
              </View>

              {food.default_serving_g ? (
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  Default serving: {food.default_serving_g} g (
                  {Math.round((food.calories_per_100g * food.default_serving_g) / 100)} kcal)
                </ThemedText>
              ) : null}

              {canDelete ? (
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    { backgroundColor: theme.surfaceContainerHighest },
                    Shadows.soft,
                    (pressed || deleting) && styles.pressed,
                  ]}>
                  <SymbolView
                    name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                    size={16}
                    tintColor={theme.error}
                  />
                  <ThemedText type="labelLg" themeColor="error">
                    {deleting ? 'Removing…' : 'Remove from database'}
                  </ThemedText>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="headlineMd">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    gap: Spacing.half,
  },
  sectionLabel: {
    marginTop: Spacing.two,
  },
  statsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  stat: {
    flexBasis: '40%',
    flexGrow: 1,
    gap: Spacing.half,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radii.full,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
