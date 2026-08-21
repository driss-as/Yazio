import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { RecipeItem } from '@/hooks/use-recipe-catalog';
import { useTheme } from '@/hooks/use-theme';

export type RecipeDetailSheetRef = {
  present: (recipe: RecipeItem) => void;
  dismiss: () => void;
};

export const RecipeDetailSheet = forwardRef<RecipeDetailSheetRef, object>(
  function RecipeDetailSheet(_props, ref) {
    const theme = useTheme();
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['85%'], []);

    const [recipe, setRecipe] = useState<RecipeItem | null>(null);

    useImperativeHandle(ref, () => ({
      present: (nextRecipe) => {
        setRecipe(nextRecipe);
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

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.surfaceContainerLowest }}
        handleIndicatorStyle={{ backgroundColor: theme.outlineVariant }}>
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {recipe ? (
            <>
              {recipe.image_url ? (
                <Image source={{ uri: recipe.image_url }} style={styles.image} resizeMode="cover" />
              ) : null}

              <ThemedText type="headlineMd">{recipe.name}</ThemedText>

              {recipe.description ? (
                <ThemedText type="bodyMd" themeColor="textSecondary">
                  {recipe.description}
                </ThemedText>
              ) : null}

              <View style={styles.metaRow}>
                {recipe.servings ? (
                  <MetaPill
                    icon={{ ios: 'person.2', android: 'people', web: 'people' }}
                    label={`${recipe.servings} servings`}
                  />
                ) : null}
                {recipe.prep_time_min ? (
                  <MetaPill
                    icon={{ ios: 'timer', android: 'timer', web: 'timer' }}
                    label={`${recipe.prep_time_min} min prep`}
                  />
                ) : null}
                {recipe.cook_time_min ? (
                  <MetaPill
                    icon={{ ios: 'flame', android: 'local_fire_department', web: 'local_fire_department' }}
                    label={`${recipe.cook_time_min} min cook`}
                  />
                ) : null}
              </View>

              <View
                style={[
                  styles.statsCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
                ]}>
                <Stat label="Calories" value={`${Math.round(recipe.calories_per_serving)} kcal`} />
                <Stat label="Carbs" value={`${Math.round(recipe.carbs_g_per_serving)} g`} />
                <Stat label="Protein" value={`${Math.round(recipe.protein_g_per_serving)} g`} />
                <Stat label="Fat" value={`${Math.round(recipe.fat_g_per_serving)} g`} />
              </View>

              {recipe.ingredients.length > 0 ? (
                <View style={styles.section}>
                  <ThemedText type="labelLg" themeColor="textSecondary">
                    Ingredients
                  </ThemedText>
                  {recipe.ingredients.map((ingredient, index) => (
                    <ThemedText key={index} type="bodyMd">
                      • {ingredient.description ?? ingredient.name}
                    </ThemedText>
                  ))}
                </View>
              ) : null}

              {recipe.directions.length > 0 ? (
                <View style={styles.section}>
                  <ThemedText type="labelLg" themeColor="textSecondary">
                    Directions
                  </ThemedText>
                  {recipe.directions.map((direction, index) => (
                    <ThemedText key={index} type="bodyMd">
                      {direction.step ?? index + 1}. {direction.description}
                    </ThemedText>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

function MetaPill({ icon, label }: { icon: SymbolViewProps['name']; label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.metaPill, { backgroundColor: theme.backgroundElement }]}>
      <SymbolView name={icon} size={14} tintColor={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

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
  image: {
    width: '100%',
    height: 180,
    borderRadius: Radii.lg,
    marginBottom: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.full,
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
  section: {
    gap: Spacing.one,
  },
});
