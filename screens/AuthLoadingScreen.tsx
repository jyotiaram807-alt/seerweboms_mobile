// screens/AuthLoadingScreen.tsx

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

export default function AuthLoadingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');

      if (token && userString) {
        const user = JSON.parse(userString);

        // Redirect based on role
        if (user.role === 'dealer') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'DealerDashboard' }],
          });
        } else if (user.role === 'retailer') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'RetailerDashboard' }],
          });
        }
        else if (user.role === 'staff') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'StaffDashboard' }],
          });
        } else {
          // Unknown role, fallback to Login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } else {
        // No token or user found, go to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    };

    checkAuth();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#5b74f1" />
    </View>
  );
}
