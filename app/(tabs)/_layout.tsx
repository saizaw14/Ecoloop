import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/navigation/haptic-tab';
import { ScanTabButton } from '@/components/navigation/scan-tab-button';
import {
  Colors,
  Fonts,
  FontWeights,
} from '@/constants/theme';
import { useAuthSession } from '@/hooks/use-auth-session';
import { syncUserDocument } from '@/services/authService';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isReady, user } = useAuthSession();

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    void syncUserDocument({
      user,
    }).catch(() => {
      // Keep navigation responsive even if the user document repair attempt fails.
    });
  }, [isReady, user?.uid]);

  if (!isReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.brand.primaryDark} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand.primaryDark,
        tabBarInactiveTintColor: '#98A2B3',
        tabBarButton: HapticTab,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 72 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ],
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons color={color} name="home-outline" size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Locate',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons color={color} name="map-marker-outline" size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan-entry"
        options={{
          title: 'Scan',
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="tips"
        options={{
          title: 'Tips',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons color={color} name="lightbulb-outline" size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons color={color} name="account-outline" size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.authBackground,
  },
  tabBar: {
    height: 72,
    paddingTop: 7,
    paddingBottom: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.brand.surface,
    borderTopWidth: 1,
    borderTopColor: '#E9EEF4',
    shadowOpacity: 0,
    elevation: 0,
  },
  tabBarItem: {
    paddingTop: 2,
  },
  tabBarIcon: {
    marginBottom: -1,
  },
  tabBarLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontFamily: Fonts.sans,
    fontWeight: FontWeights.medium,
  },
});
