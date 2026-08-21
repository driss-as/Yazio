import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFoodCatalogSheet, type AddFoodCatalogSheetRef } from '@/components/add-food-catalog-sheet';
import { FoodDetailSheet, type FoodDetailSheetRef } from '@/components/food-detail-sheet';
import { RecipeDetailSheet, type RecipeDetailSheetRef } from '@/components/recipe-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { type FoodItem, useFoodCatalog } from '@/hooks/use-food-catalog';
import { type RecipeItem, useRecipeCatalog } from '@/hooks/use-recipe-catalog';
import { useTheme } from '@/hooks/use-theme';

type Section = 'foods' | 'recipes';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'foods', label: 'Aliments' },
  { value: 'recipes', label: 'Recettes' },
];

export default function DatabaseScreen() {
  const theme = useTheme();
  const catalog = useFoodCatalog();
  const recipeCatalog = useRecipeCatalog();
  const addSheetRef = useRef<AddFoodCatalogSheetRef>(null);
  const detailSheetRef = useRef<FoodDetailSheetRef>(null);
  const recipeDetailSheetRef = useRef<RecipeDetailSheetRef>(null);
  const [section, setSection] = useState<Section>('foods');
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
          <View style={styles.header}>
            <ThemedText type="headlineLgMobile">Base de données</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Aliments & recettes
            </ThemedText>
          </View>

          <View style={[styles.tabBar, { backgroundColor: theme.backgroundElement }]}>
            {SECTIONS.map((item) => {
              const selected = item.value === section;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setSection(item.value)}
                  style={[
                    styles.tabItem,
                    selected && { backgroundColor: theme.surfaceContainerLowest },
                    selected && Shadows.soft,
                  ]}>
                  <ThemedText
                    type="labelLg"
                    themeColor={selected ? 'text' : 'textSecondary'}>
                    {item.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {section === 'foods' ? (
            <FoodsSection catalog={catalog} onSelectFood={(food) => detailSheetRef.current?.present(food)} />
          ) : (
            <RecipesSection
              catalog={recipeCatalog}
              onSelectRecipe={(recipe) => recipeDetailSheetRef.current?.present(recipe)}
            />
          )}
        </View>
      </ScrollView>

      {section === 'foods' ? (
        <Pressable
          onPress={() => addSheetRef.current?.present()}
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
      ) : null}

      <AddFoodCatalogSheet ref={addSheetRef} onAdd={catalog.addFood} />
      <FoodDetailSheet ref={detailSheetRef} userId={catalog.userId} onDelete={catalog.deleteFood} />
      <RecipeDetailSheet ref={recipeDetailSheetRef} />
    </View>
  );
}

function FoodsSection({
  catalog,
  onSelectFood,
}: {
  catalog: ReturnType<typeof useFoodCatalog>;
  onSelectFood: (food: FoodItem) => void;
}) {
  const theme = useTheme();

  return (
    <>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
        ]}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <TextInput
          value={catalog.query}
          onChangeText={catalog.setQuery}
          placeholder="Search foods"
          placeholderTextColor={theme.outline}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      {catalog.loading ? (
        <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.stateText}>
          Loading…
        </ThemedText>
      ) : catalog.foods.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
              size={32}
              tintColor={theme.primary}
            />
          </View>
          <ThemedText type="headlineMd" style={styles.stateText}>
            {catalog.query ? 'No foods match your search' : 'No foods yet'}
          </ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.stateText}>
            Add a food to start building your database.
          </ThemedText>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest }, Shadows.soft]}>
          {catalog.foods.map((food, index) => (
            <FoodRow
              key={food.id}
              food={food}
              isLast={index === catalog.foods.length - 1}
              onPress={() => onSelectFood(food)}
            />
          ))}
        </View>
      )}
    </>
  );
}

function RecipesSection({
  catalog,
  onSelectRecipe,
}: {
  catalog: ReturnType<typeof useRecipeCatalog>;
  onSelectRecipe: (recipe: RecipeItem) => void;
}) {
  const theme = useTheme();

  return (
    <>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
        ]}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <TextInput
          value={catalog.query}
          onChangeText={catalog.setQuery}
          placeholder="Search recipes"
          placeholderTextColor={theme.outline}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      {catalog.loading ? (
        <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.stateText}>
          Loading…
        </ThemedText>
      ) : catalog.recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView
              name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
              size={32}
              tintColor={theme.primary}
            />
          </View>
          <ThemedText type="headlineMd" style={styles.stateText}>
            {catalog.query ? 'No recipes match your search' : 'No recipes yet'}
          </ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.stateText}>
            Coming soon
          </ThemedText>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest }, Shadows.soft]}>
          {catalog.recipes.map((recipe, index) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              isLast={index === catalog.recipes.length - 1}
              onPress={() => onSelectRecipe(recipe)}
            />
          ))}
        </View>
      )}
    </>
  );
}

function RecipeRow({
  recipe,
  isLast,
  onPress,
}: {
  recipe: RecipeItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.foodRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.outlineVariant },
        pressed && styles.pressed,
      ]}>
      {recipe.image_url ? (
        <Image source={{ uri: recipe.image_url }} style={styles.recipeThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.foodIcon, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView
            name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
            size={18}
            tintColor={theme.primary}
          />
        </View>
      )}

      <View style={styles.foodInfo}>
        <ThemedText type="bodyLg" numberOfLines={1}>
          {recipe.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {Math.round(recipe.calories_per_serving)} kcal / serving
          {recipe.prep_time_min ? ` · ${recipe.prep_time_min} min` : ''}
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

function FoodRow({
  food,
  isLast,
  onPress,
}: {
  food: FoodItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.foodRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.outlineVariant },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.foodIcon, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
          size={18}
          tintColor={theme.primary}
        />
      </View>

      <View style={styles.foodInfo}>
        <ThemedText type="bodyLg" numberOfLines={1}>
          {food.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {Math.round(food.calories_per_100g)} kcal / 100g
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
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: Radii.full,
    padding: Spacing.half,
    gap: Spacing.half,
    marginBottom: Spacing.four,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radii.full,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.four,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  card: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  foodIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeThumb: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
  },
  foodInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  stateText: {
    textAlign: 'center',
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
  pressed: {
    opacity: 0.7,
  },
});
