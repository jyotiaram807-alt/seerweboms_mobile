import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import './global.css';
import type { RootStackParamList } from 'types/navigation';
import { ImageBackground, View, StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';

import AuthLoadingScreen from './screens/AuthLoadingScreen';
import LoginScreen from './screens/LoginScreen';
import AboutScreen from './screens/AboutScreen';
import ContactScreen from './screens/ContactScreen';
import ProfileScreen from './screens/ProfileScreen';
import RetailerDashboardScreen from './screens/retailer/RetailerDashboard';
import RetailerHomeScreen from './screens/retailer/RetailerHome';
import CartScreen from './screens/CartScreen';
import StaffCartScreen from './screens/StaffCartScreen';
import RetailerOrderScreen from './screens/retailer/RetailerOrderScreen';
import StaffScreen from './screens/sales_executive/StaffScreen';
import StaffDashboard from './screens/sales_executive/StaffDashboard';
import StaffOrderScreen from './screens/sales_executive/StaffOrderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

function AppContent() {
  const { mode } = useTheme();

  return (
    <ImageBackground
      source={require('./assets/images/bga.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
      imageStyle={{ opacity: 0.2 }}
    >
      {/* Dark / Light Overlay */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor:
              mode === 'dark'
                ? 'rgba(0,0,0,0.65)'
                : 'rgba(255,255,255,0.2)',
          },
        ]}
      />

      <NavigationContainer theme={MyTheme}>
        <Stack.Navigator
          initialRouteName="AuthLoading"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="RetailerDashboard" component={RetailerDashboardScreen} />
          <Stack.Screen name="RetailerHome" component={RetailerHomeScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Contact" component={ContactScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="StaffCartScreen" component={StaffCartScreen} />
          <Stack.Screen name="RetailerOrderScreen" component={RetailerOrderScreen} />
          <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
          <Stack.Screen name="StaffScreen" component={StaffScreen} />
          <Stack.Screen name="StaffOrderScreen" component={StaffOrderScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ImageBackground>
  );
}

export default function App() {
  return (
    <CartProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </CartProvider>
  );
}
