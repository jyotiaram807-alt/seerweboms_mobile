import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { EventRegister } from 'react-native-event-listeners';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface TabItem {
  name: string;
  route: keyof RootStackParamList;
  icon: (active: boolean) => React.ReactNode;
  badge?: number;
}

export default function BottomTabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const currentRoute = route.name;
  const { colors } = useTheme();

  const [role, setRole] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const userStr = await AsyncStorage.getItem('user');
      const cartStr = await AsyncStorage.getItem('cart');

      if (userStr) {
        const user = JSON.parse(userStr);
        setRole(user?.role);
      }

      if (cartStr) {
        const cart: Record<string, number> = JSON.parse(cartStr);
        const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
        setCartCount(count);
      }
    };

    loadData();

    const listener = EventRegister.addEventListener('cartChanged', (count) => {
      if (typeof count === 'number') setCartCount(count);
    });

    return () => {
      EventRegister.removeEventListener(listener as string);
    };
  }, []);

  const activeColor = colors.primary;
  const inactiveColor = colors.textSecondary;

  // Define tabs based on role
  const retailerTabs: TabItem[] = [
    {
      name: 'Dashboard',
      route: 'RetailerDashboard',
      icon: (active) => <MaterialIcons name="dashboard" size={24} color={active ? activeColor : inactiveColor} />,
    },
    {
      name: 'Products',
      route: 'RetailerHome',
      icon: (active) => <Ionicons name="grid-outline" size={24} color={active ? activeColor : inactiveColor} />,
    },
    {
      name: 'Cart',
      route: 'Cart',
      icon: (active) => <Feather name="shopping-cart" size={24} color={active ? activeColor : inactiveColor} />,
      badge: cartCount,
    },
    {
      name: 'Orders',
      route: 'RetailerOrderScreen',
      icon: (active) => <Feather name="package" size={24} color={active ? activeColor : inactiveColor} />,
    },
  ];

  const staffTabs: TabItem[] = [
    {
      name: 'Dashboard',
      route: 'StaffDashboard',
      icon: (active) => <MaterialIcons name="dashboard" size={24} color={active ? activeColor : inactiveColor} />,
    },
    {
      name: 'Customers',
      route: 'StaffScreen',
      icon: (active) => <Feather name="users" size={24} color={active ? activeColor : inactiveColor} />,
    },
    {
      name: 'Cart',
      route: 'StaffCartScreen',
      icon: (active) => <Feather name="shopping-cart" size={24} color={active ? activeColor : inactiveColor} />,
      badge: cartCount,
    },
    {
      name: 'Orders',
      route: 'StaffOrderScreen',
      icon: (active) => <Feather name="package" size={24} color={active ? activeColor : inactiveColor} />,
    },
  ];

  const tabs = role === 'retailer' ? retailerTabs : role === 'staff' ? staffTabs : [];

  if (!role || (role !== 'retailer' && role !== 'staff')) {
    return null;
  }

  return (
    <View 
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
      }}
      data-testid="bottom-tab-navigator"
    >
      <View className="flex-row justify-around items-center">
        {tabs.map((tab) => {
          const isActive = currentRoute === tab.route;
          return (
            <Pressable
              key={tab.route}
              onPress={() => navigation.replace(tab.route)}
              className="items-center justify-center py-1 px-2"
              data-testid={`tab-${tab.name.toLowerCase()}`}
            >
              <View className="relative">
                {tab.icon(isActive)}
                {tab.badge !== undefined && tab.badge > 0 ? (
                  <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">{tab.badge > 99 ? '99+' : tab.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text 
                style={{ color: isActive ? colors.primary : colors.textSecondary }}
                className="text-[10px] mt-1 font-medium"
              >
                {tab.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
