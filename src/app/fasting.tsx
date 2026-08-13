import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function FastingScreen() {
  return (
    <PlaceholderScreen
      title="Fasting"
      icon={{ ios: 'timer', android: 'timer', web: 'timer' }}
      message="Track your fasting windows"
    />
  );
}
