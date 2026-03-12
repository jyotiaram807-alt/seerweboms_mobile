import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from 'apiurl';
import { SafeAreaView } from 'react-native-safe-area-context';

import RefreshWrapper from 'components/RefreshWrapper'; // Make sure the path is correct

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
  try {
    setErrorMessage('');

    console.log("Calling API:", `${apiUrl}/login`);

    const response = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    console.log("Response status:", response.status);

    const data = await response.json();
    console.log("Response data:", data);

    if (response.ok && data.message === 'Login successful') {
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'dealer') {
        navigation.reset({ index: 0, routes: [{ name: 'DealerDashboard' }] });
      } else if (data.user.role === 'retailer') {
        navigation.reset({ index: 0, routes: [{ name: 'RetailerDashboard' }] });
      } else if (data.user.role === 'staff') {
        navigation.reset({ index: 0, routes: [{ name: 'StaffDashboard' }] });
      } else {
        setErrorMessage('Invalid role.');
      }
    } else {
      setErrorMessage(data.message || 'Invalid username or password.');
    }
  } catch (error) {
    console.log("Login error:", error);
    setErrorMessage('Something went wrong. Please try again.');
  }
};

  // Function to handle pull-to-refresh
  const handleRefresh = async () => {
    setUsername('');
    setPassword('');
    setErrorMessage('');
  };

  return (
    <SafeAreaView className="flex-1">
      <RefreshWrapper onRefresh={handleRefresh}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center items-center"
        >
          {/* Background Image */}
          <Animated.Image
            source={require('../assets/images/login_mobile.png')}
            className="absolute top-0 left-0 h-full w-full opacity-20"
            resizeMode="cover"
          />

          {/* Login Form */}
          <View className="w-full max-w-md p-6 rounded-2xl mb-32">
            <Animated.Image
              entering={FadeInUp.delay(200).duration(500).springify()}
              source={require('../assets/favicon.png')}
              className="w-24 h-24 mt-6 mb-16 self-center"
              resizeMode="contain"
            />

            {/* Username */}
            <Animated.View entering={FadeInDown.delay(200).duration(1500).springify()} className=" rounded-2xl mb-4 bg-white">
              <TextInput
                placeholder="Username"
                className="border rounded-2xl h-14 px-4"
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={username}
                onChangeText={setUsername}
              />
            </Animated.View>

            {/* Password */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(1500).springify()}
              className="border bg-white rounded-2xl h-14 px-4 flex-row items-center"
            >
              <TextInput
                placeholder="Password"
                className="flex-1"
                secureTextEntry={!showPassword}
                placeholderTextColor="rgba(0,0,0,0.4)"
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#888" />
              </Pressable>
            </Animated.View>

            {/* Error Message */}
            {errorMessage ? (
              <Text className="text-red-500 text-sm mt-2 ml-2">{errorMessage}</Text>
            ) : null}

            {/* Login Button */}
            <Animated.View entering={FadeInDown.delay(400).duration(1500).springify()}>
              <Pressable
                className="bg-[#5b74f1] rounded-2xl py-3 mt-8 h-12 justify-center"
                onPress={handleLogin}
              >
                <Text className="text-center text-white font-semibold">Login</Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(400).duration(1500).springify()}
              className="mt-4 w-full items-center"
            >
              <Text className="px-4 py-2 text-center rounded-md w-[90%] text-gray-700">
                Don't have your login details? Please contact your dealer.
              </Text>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </RefreshWrapper>
    </SafeAreaView>
  );
}
