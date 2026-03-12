import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

interface NavbarProps {
  user: any;
}

export default function Navbar({ user }: NavbarProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      'user',
      'token',
      'cart',
      'selectedRetailer',
      'welcomeShown',
    ]);

    setMenuVisible(false);

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View className="px-4 py-3 bg-white flex-row items-center justify-between border-b border-gray-200">
      {/* Branding */}
      <View className="flex-row items-center">
        <Image
          source={require('../assets/icon.png')}
          style={{ width: 28, height: 28, marginRight: 8 }}
          resizeMode="contain"
        />
        <Text className="text-lg font-bold text-gray-900">
          Seerweb OMS
        </Text>
      </View>

      {/* Menu */}
      <Pressable onPress={() => setMenuVisible(true)} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={22} color="#374151" />
      </Pressable>

      {/* Dropdown */}
      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: 60,
              right: 16,
              backgroundColor: 'white',
              borderRadius: 10,
              width: 180,
              elevation: 6,
            }}
          >
            {/* Profile */}
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                navigation.replace('Profile');
              }}
              style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}
            >
              <Ionicons name="person-outline" size={18} color="#111827" />
              <Text className="ml-3 font-medium text-gray-800">
                Profile
              </Text>
            </Pressable>

            <View className="h-[1px] bg-gray-200" />

            {/* Logout */}
            <Pressable
              onPress={handleLogout}
              style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text className="ml-3 font-medium text-red-500">
                Logout
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}