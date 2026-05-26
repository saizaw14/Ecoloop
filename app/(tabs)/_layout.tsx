import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { HapticTab } from '@/components/navigation/haptic-tab';
import { ScanTabButton } from '@/components/navigation/scan-tab-button';
import {
  Colors,
  Fonts,
  FontWeights,
} from '@/constants/theme';

export default function TabLayout() {
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
        tabBarStyle: styles.tabBar,
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
        name="scan"
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 7,
    paddingBottom: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
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
