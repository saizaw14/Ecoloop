import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Colors,
  Fonts,
  FontSizes,
  FontWeights,
  LineHeights,
  Spacing,
} from '@/constants/theme';

type TabPlaceholderScreenProps = {
  accentColor: string;
  iconName: ComponentProps<typeof MaterialCommunityIcons>['name'];
  subtitle: string;
  title: string;
};

export function TabPlaceholderScreen({
  accentColor,
  iconName,
  subtitle,
  title,
}: TabPlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
            <MaterialCommunityIcons name={iconName} size={28} color={Colors.brand.onPrimary} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.caption}>This EcoLoop section is ready for the next screen.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.brand.authBackground,
  },
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    backgroundColor: Colors.brand.surface,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.brand.text,
    fontSize: FontSizes.title,
    lineHeight: LineHeights.title,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.brand.body,
    fontSize: FontSizes.body,
    lineHeight: LineHeights.body,
    fontFamily: Fonts.sans,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  caption: {
    color: '#667387',
    fontSize: FontSizes.sm,
    lineHeight: LineHeights.sm,
    fontFamily: Fonts.sans,
    textAlign: 'center',
  },
});
