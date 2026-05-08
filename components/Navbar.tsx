import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
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
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      'user',
      'token',
      'cart',
      'selectedRetailer',
      'welcomeShown',
    ]);
    setLogoutVisible(false);
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
        <Text className="text-lg font-bold text-gray-900">Seerweb OMS</Text>
      </View>

      {/* Menu trigger */}
      <Pressable onPress={() => setMenuVisible(true)} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={22} color="#374151" />
      </Pressable>

      {/* ── Dropdown menu ────────────────────────────────────────── */}
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
              <Text className="ml-3 font-medium text-gray-800">Profile</Text>
            </Pressable>

            <View className="h-[1px] bg-gray-200" />

            {/* Logout — opens confirm modal instead of logging out directly */}
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                setLogoutVisible(true);
              }}
              style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text className="ml-3 font-medium text-red-500">Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ── Logout confirmation modal ─────────────────────────────── */}
      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View
            style={{ backgroundColor: '#ffffff' }}
            className="w-full max-w-sm rounded-2xl p-5"
          >
            <View className="items-center mb-4">
              <View className="bg-red-100 p-3 rounded-full mb-3">
                <Feather name="log-out" size={28} color="#ef4444" />
              </View>
              <Text style={{ color: '#111827' }} className="text-lg font-bold">
                Logout
              </Text>
              <Text style={{ color: '#6b7280' }} className="text-center mt-2">
                Are you sure you want to logout? You'll need to login again to access your account.
              </Text>
            </View>

            <View className="flex-row">
              <Pressable
                className="flex-1 py-3 rounded-xl mr-2"
                style={{ backgroundColor: '#e5e7eb' }}
                onPress={() => setLogoutVisible(false)}
              >
                <Text style={{ color: '#111827' }} className="text-center font-semibold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-xl ml-2 bg-red-500"
                onPress={handleLogout}
              >
                <Text className="text-center font-semibold text-white">Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
