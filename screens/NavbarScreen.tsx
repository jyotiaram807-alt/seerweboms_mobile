import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { EventRegister } from 'react-native-event-listeners';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function NavbarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const currentRoute = route.name;

  const [cartCount, setCartCount] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

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

  const count = Object.values(cart).reduce(
    (sum, qty) => sum + qty,
    0
  );

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

  const logout = async () => {
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const active = '#566de2';
  const inactive = '#000';

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} >
        <View className="flex-row justify-between items-center px-4 py-3">
          <Text className="text-lg font-bold text-[#566de2]">Seerweb OMS</Text>

          <View className="flex-row items-center">
            {role === 'dealer' && (
              <>
                <Pressable className="mr-6" onPress={() => navigation.replace('DealerDashboard')}>
                  <MaterialIcons
                    name="dashboard"
                    size={22}
                    color={currentRoute === 'DealerDashboard' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('Orders')}>
                  <Feather
                    name="package"
                    size={22}
                    color={currentRoute === 'Orders' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('Retailers')}>
                  <Feather
                    name="users"
                    size={22}
                    color={currentRoute === 'Retailers' ? active : inactive}
                  />
                </Pressable>
              </>
            )}

            {role === 'retailer' && (
              <>
                <Pressable className="mr-6" onPress={() => navigation.replace('RetailerDashboard')}>
                  <MaterialIcons
                    name="dashboard"
                    size={22}
                    color={currentRoute === 'RetailerDashboard' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('RetailerHome')}>
                  <Ionicons
                    name="grid-outline"
                    size={22}
                    color={currentRoute === 'RetailerHome' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6 relative" onPress={() => navigation.replace('Cart')}>
                  <FontAwesome5
                    name="shopping-cart"
                    size={20}
                    color={currentRoute === 'Cart' ? active : inactive}
                  />
                  {cartCount > 0 && (
                    <View className="absolute -top-1 -right-2 bg-red-500 rounded-full px-1">
                      <Text className="text-white text-xs font-bold">{cartCount}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('RetailerOrderScreen')}>
                  <Feather
                    name="package"
                    size={22}
                    color={currentRoute === 'RetailerOrderScreen' ? active : inactive}
                  />
                </Pressable>
              </>
            )}

            {role === 'staff' && (
              <>
                <Pressable className="mr-6" onPress={() => navigation.replace('StaffScreen')}>
                  <Ionicons
                    name="home-outline"
                    size={22}
                    color={currentRoute === 'StaffScreen' ? active : inactive}
                  />
                </Pressable>

                <Pressable className="mr-6" onPress={() => navigation.replace('StaffOrderScreen')}>
                  <Feather
                    name="package"
                    size={22}
                    color={currentRoute === 'StaffOrderScreen' ? active : inactive}
                  />
                </Pressable>
              </>
            )}

            <Pressable onPress={() => setLogoutVisible(true)}>
              <Ionicons name="log-out-outline" size={22} color={inactive} />
            </Pressable>
          </View>
        </View>

        {/* Logout Modal */}
        <Modal transparent visible={logoutVisible} animationType="fade">
          <View className="flex-1 bg-black/40 justify-center items-center">
            <View className="bg-white w-[80%] rounded-xl p-6">
              <Text className="text-lg font-bold text-center mb-3">Logout</Text>
              <Text className="text-center mb-6">Are you sure?</Text>

              <View className="flex-row justify-between">
                <Pressable
                  className="bg-gray-200 px-6 py-2 rounded-lg"
                  onPress={() => setLogoutVisible(false)}
                >
                  <Text>Cancel</Text>
                </Pressable>

                <Pressable
                  className="bg-red-500 px-6 py-2 rounded-lg"
                  onPress={logout}
                >
                  <Text className="text-white">Logout</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}
