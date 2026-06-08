import { Stack } from 'expo-router';

import { sharedStackScreenOptions } from '@/constants/navigation';

export default function ProfileStackLayout() {
  return <Stack screenOptions={sharedStackScreenOptions} />;
}
