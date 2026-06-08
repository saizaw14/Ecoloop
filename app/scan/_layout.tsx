import { Stack } from 'expo-router';

import { sharedStackScreenOptions } from '@/constants/navigation';

export default function ScanStackLayout() {
  return <Stack screenOptions={sharedStackScreenOptions} />;
}
