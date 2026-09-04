import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFoodCatalogSheet, type AddFoodCatalogSheetRef } from '@/components/add-food-catalog-sheet';
import { FoodDetailSheet, type FoodDetailSheetRef } from '@/components/food-detail-sheet';
import { RecipeDetailSheet, type RecipeDetailSheetRef } from '@/components/recipe-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radii, Shadows, Spacing } from '@/constants/theme';
import { type FoodItem, useFoodCatalog } from '@/hooks/use-food-catalog';
import { usePremiumStatus } from '@/hooks/use-premium-status';
import { type RecipeItem, useRecipeCatalog } from '@/hooks/use-recipe-catalog';
import { useTheme } from '@/hooks/use-theme';

type Section = 'foods' | 'recipes';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'foods', label: 'Aliments' },
  { value: 'recipes', label: 'Recettes' },
];

// Free accounts only see the first page in full; from page 2 onward, most
// results are locked behind Premium to encourage upgrading.
const PAGE_SIZE = 10;
const FREE_UNLOCK_RATIO = 0.4;

function paginate<T>(items: T[], page: number) {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

function unlockedCountFor(pageItemsLength: number, page: number, isPremium: boolean) {
  if (isPremium || page === 1) return pageItemsLength;
  return Math.ceil(pageItemsLength * FREE_UNLOCK_RATIO);
}

export default function DatabaseScreen() {
  const theme = useTheme();
  const catalog = useFoodCatalog();
  const recipeCatalog = useRecipeCatalog();
  const premium = usePremiumStatus();

  useFocusEffect(
    useCallback(() => {
      premium.refresh();
    }, [premium.refresh])
  );

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
            <FoodsSection
              catalog={catalog}
              isPremium={premium.isPremium}
              onSelectFood={(food) => detailSheetRef.current?.present(food)}
            />
          ) : (
            <RecipesSection
              catalog={recipeCatalog}
              isPremium={premium.isPremium}
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
  isPremium,
  onSelectFood,
}: {
  catalog: ReturnType<typeof useFoodCatalog>;
  isPremium: boolean;
  onSelectFood: (food: FoodItem) => void;
}) {
  const theme = useTheme();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [catalog.query]);

  const totalPages = Math.max(1, Math.ceil(catalog.foods.length / PAGE_SIZE));
  const pageItems = paginate(catalog.foods, page);
  const unlockedCount = unlockedCountFor(pageItems.length, page, isPremium);

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
        <>
          <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest }, Shadows.soft]}>
            {pageItems.map((food, index) =>
              index < unlockedCount ? (
                <FoodRow
                  key={food.id}
                  food={food}
                  isLast={index === pageItems.length - 1}
                  onPress={() => onSelectFood(food)}
                />
              ) : (
                <LockedRow key={food.id} isLast={index === pageItems.length - 1} />
              )
            )}
          </View>

          {unlockedCount < pageItems.length ? <PremiumUnlockBanner /> : null}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}

function RecipesSection({
  catalog,
  isPremium,
  onSelectRecipe,
}: {
  catalog: ReturnType<typeof useRecipeCatalog>;
  isPremium: boolean;
  onSelectRecipe: (recipe: RecipeItem) => void;
}) {
  const theme = useTheme();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [catalog.query]);

  const totalPages = Math.max(1, Math.ceil(catalog.recipes.length / PAGE_SIZE));
  const pageItems = paginate(catalog.recipes, page);
  const unlockedCount = unlockedCountFor(pageItems.length, page, isPremium);

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
        <>
          <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest }, Shadows.soft]}>
            {pageItems.map((recipe, index) =>
              index < unlockedCount ? (
                <RecipeRow
                  key={recipe.id}
                  recipe={recipe}
                  isLast={index === pageItems.length - 1}
                  onPress={() => onSelectRecipe(recipe)}
                />
              ) : (
                <LockedRow key={recipe.id} isLast={index === pageItems.length - 1} />
              )
            )}
          </View>

          {unlockedCount < pageItems.length ? <PremiumUnlockBanner /> : null}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}

function LockedRow({ isLast }: { isLast: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/premium')}
      style={({ pressed }) => [
        styles.foodRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.outlineVariant },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.foodIcon, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          size={16}
          tintColor={theme.textSecondary}
        />
      </View>

      <View style={styles.foodInfo}>
        <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.lockedLabel}>
          Résultat Premium
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

function PremiumUnlockBanner() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/premium')}
      style={({ pressed }) => [
        styles.premiumBanner,
        { backgroundColor: theme.primaryContainer },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
        size={16}
        tintColor={theme.onPrimaryContainer}
      />
      <ThemedText type="small" style={[styles.premiumBannerText, { color: theme.onPrimaryContainer }]}>
        Passez Premium pour voir tous les résultats
      </ThemedText>
    </Pressable>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const theme = useTheme();

  if (totalPages <= 1) return null;

  return (
    <View style={styles.pagination}>
      <Pressable
        onPress={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={({ pressed }) => [
          styles.paginationButton,
          { backgroundColor: theme.backgroundElement },
          (pressed || page === 1) && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={16}
          tintColor={theme.text}
        />
      </Pressable>

      <ThemedText type="labelLg" themeColor="textSecondary">
        Page {page} / {totalPages}
      </ThemedText>

      <Pressable
        onPress={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={({ pressed }) => [
          styles.paginationButton,
          { backgroundColor: theme.backgroundElement },
          (pressed || page === totalPages) && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={16}
          tintColor={theme.text}
        />
      </Pressable>
    </View>
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
  lockedLabel: {
    fontStyle: 'italic',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radii.lg,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  premiumBannerText: {
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
