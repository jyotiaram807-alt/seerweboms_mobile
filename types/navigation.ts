import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  NavbarScreen: undefined;
  Login: undefined;
  AuthLoading: undefined;

  // Dealer
  DealerDashboard: undefined;
  Orders: undefined;        // ✅ ADD
  Retailers: undefined;     // ✅ ADD

  // Retailer
  RetailerDashboard: undefined;
  RetailerHome: undefined;
  Cart: undefined;
  RetailerOrderScreen: undefined;

  // Staff
  StaffDashboard: undefined;
  StaffScreen: undefined;
  StaffOrderScreen: undefined;
  StaffCartScreen: undefined;

  // Static
  About: undefined;
  Contact: undefined;
  Profile: undefined;
};

export type DealerDashboardScreenProps =
  NativeStackScreenProps<RootStackParamList, 'DealerDashboard'>;

export type OrdersScreenProps =
  NativeStackScreenProps<RootStackParamList, 'Orders'>;

export type RetailersScreenProps =
  NativeStackScreenProps<RootStackParamList, 'Retailers'>;

export type RetailerDashboardProps =
  NativeStackScreenProps<RootStackParamList, 'RetailerDashboard'>;

export type RetailerHomeProps =
  NativeStackScreenProps<RootStackParamList, 'RetailerHome'>;

export type CartScreenProps =
  NativeStackScreenProps<RootStackParamList, 'Cart'>;

export type RetailerOrderScreenProps =
  NativeStackScreenProps<RootStackParamList, 'RetailerOrderScreen'>;

export type StaffScreenProps =
  NativeStackScreenProps<RootStackParamList, 'StaffScreen'>;

export type StaffDashboardProps =
  NativeStackScreenProps<RootStackParamList, 'StaffDashboard'>;

export type StaffOrderScreenProps =
  NativeStackScreenProps<RootStackParamList, 'StaffOrderScreen'>;

export type StaffCartScreenProps =
  NativeStackScreenProps<RootStackParamList, 'StaffCartScreen'>;
