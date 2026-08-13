import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ProfileScreen() {
  return (
    <PlaceholderScreen
      title="Profile"
      icon={{ ios: 'person.crop.circle', android: 'person', web: 'person' }}
      message="Manage your account"
    />
  );
}
