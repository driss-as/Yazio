import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function RecipesScreen() {
  return (
    <PlaceholderScreen
      title="Recipes"
      icon={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
      message="Browse healthy recipes"
    />
  );
}
