import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import RefreshWrapper from '../../components/RefreshWrapper';
import BottomTabNavigator from '../../components/BottomTabNavigator';
import Svg, { Path, Circle, G, Text as SvgText, Line, Rect } from 'react-native-svg';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '@/lib/services/api';
import Navbar from '../../components/Navbar';

type OrderItem = {
  quantity: number;
  price: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');


// Mock Data for Sales Executive


interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  bgColor: string;
  change?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColor, change }) => {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm flex-1 mx-1 min-w-[150px]" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-gray-500 text-xs font-medium" numberOfLines={1}>{title}</Text>
        <View style={{ backgroundColor: bgColor }} className="p-2 rounded-xl">
          {icon}
        </View>
      </View>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      {change !== undefined && (
        <View className="flex-row items-center mt-2">
          <View 
            style={{ backgroundColor: isPositive ? '#d1fae5' : '#fee2e2' }} 
            className="flex-row items-center px-2 py-1 rounded-full"
          >
            <Text style={{ color: changeColor }} className="text-xs font-semibold">
              {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{change.toFixed(1)}%
            </Text>
          </View>
          <Text className="text-gray-400 text-[10px] ml-1">vs last month</Text>
        </View>
      )}
    </View>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: { month: string; value: number }[];
  width: number;
  height: number;
  color: string;
  label: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, width, height, color, label }) => {
  const padding = { top: 20, right: 15, bottom: 40, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
  const barWidth = (chartWidth / data.length) * 0.6;
  const barGap = (chartWidth / data.length) * 0.4;

  return (
    <View>
      <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
      <Svg width={width} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <G key={i}>
            <Line
              x1={padding.left}
              y1={padding.top + chartHeight * (1 - ratio)}
              x2={width - padding.right}
              y2={padding.top + chartHeight * (1 - ratio)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <SvgText
              x={padding.left - 5}
              y={padding.top + chartHeight * (1 - ratio) + 4}
              textAnchor="end"
              fontSize="9"
              fill="#9ca3af"
            >
              {Math.round(maxValue * ratio / 1000)}k
            </SvgText>
          </G>
        ))}

        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding.left + i * (barWidth + barGap) + barGap / 2;
          const y = padding.top + chartHeight - barHeight;

          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {d.month}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

// Donut Chart Component
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size: number;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, size }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;
  
  const radius = size / 2 - 15;
  const innerRadius = radius * 0.6;
  const center = size / 2;

  let currentAngle = -90;

  const paths = data.map((item, index) => {
    if (item.value === 0) return null;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return <Path key={index} d={d} fill={item.color} />;
  });

  return (
    <Svg width={size} height={size}>
      <G>{paths}</G>
      <SvgText x={center} y={center - 5} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1f2937">
        {total}
      </SvgText>
      <SvgText x={center} y={center + 12} textAnchor="middle" fontSize="9" fill="#6b7280">
        Total Orders
      </SvgText>
    </Svg>
  );
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#dbeafe', text: '#1e40af' },
  delivered: { bg: '#d1fae5', text: '#065f46' },
};

export default function StaffDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // const [orders, setOrders] = useState(MOCK_ORDERS);
  // const [retailers] = useState(MOCK_RETAILERS);
  const [orders, setOrders] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (!userStr) {
          navigation.replace('Login');
          return;
        }

        const userData = JSON.parse(userStr);
        if (userData.role !== 'staff') {
          navigation.replace('RetailerDashboard');
          return;
        }

        setUser(userData);

        const executiveId = userData.id;

        // 🔥 LIVE API CALLS
        const ordersRes = await apiGet(
          `/orders/byexecutive?executiveid=${executiveId}`
        );

        const retailersRes = await apiGet(
          `/staff/get_retailers_by_executive?executiveid=${executiveId}`
        );

        const normalizeArray = (data: any) => {
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.orders)) return data.orders;
          if (Array.isArray(data?.data)) return data.data;
          return [];
        };

        setOrders(normalizeArray(ordersRes));
        setRetailers(normalizeArray(retailersRes));

      } catch (error) {
        console.error('Dashboard load failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);
  
  type Order = {
  id: number;
  ledgerName: string;
  createdAt: string;
  items: {
    quantity: number;
    price: number;
  }[];
  status?: string;
};

  // Calculate statistics
  const stats = useMemo(() => {
    const LAST_MONTH_STATS = {
      totalOrders: 5,
      totalCustomers: 4,
      pendingOrders: 1,
      totalRevenue: 980000,
    };

    const totalOrders = orders.length;
    const pendingOrders = (orders || []).filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    const totalRevenue = orders.reduce((sum: number, o: Order) => {
      const items = Array.isArray(o.items) ? o.items : [];
      return (
        sum +
        items.reduce(
          (itemSum: number, i: OrderItem) =>
            itemSum + (i.quantity || 0) * (i.price || 0),
          0
        )
      );
    }, 0);

    const totalCustomers = retailers.length;

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      totalCustomers,
      totalOrdersChange: calcChange(totalOrders, LAST_MONTH_STATS.totalOrders),
      customersChange: calcChange(totalCustomers, LAST_MONTH_STATS.totalCustomers),
      pendingChange: calcChange(pendingOrders, LAST_MONTH_STATS.pendingOrders),
    };
  }, [orders, retailers]);

  // Order status distribution
  const statusDistribution = useMemo(() => [
    { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: '#f59e0b' },
    { label: 'Approved', value: orders.filter(o => o.status === 'approved').length, color: '#3b82f6' },
    { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: '#10b981' },
  ], [orders]);

 const recentOrders = useMemo(() => {
  return orders
    .slice(0, 4)
    .map(o => {
      const items = Array.isArray(o.items) ? o.items : [];

      return {
        id: o.id,
        storeName: o.ledgerName,
        items: items.reduce(
          (sum: number, i: OrderItem) => sum + i.quantity,
          0
        ),
        total: items.reduce(
          (sum: number, i: OrderItem) => sum + i.quantity * i.price,
          0
        ),
        date: o.createdAt,
        status: o.status ?? 'pending',
      };
    });
}, [orders]);

  const topCustomers = useMemo(() => retailers.slice(0, 3), [retailers]);

  const handleRefresh = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;

      const userData = JSON.parse(userStr);
      const executiveId = userData.id;

      const ordersRes = await apiGet(
        `/orders/byexecutive?executiveid=${executiveId}`
      );
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
    } catch (e) {
      console.error('Refresh failed', e);
    }
  };

  const chartWidth = SCREEN_WIDTH - 64;

  if (loading) {
    return (
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#566de2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <Navbar user={user?.name} />
      <RefreshWrapper onRefresh={handleRefresh}>
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View className="mb-6" data-testid="staff-dashboard-header">
           
          </View>

          {/* Stats Cards - Row 1 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <StatCard
              title="Total Orders"
              value={stats.totalOrders}
              icon={<Feather name="shopping-bag" size={18} color="#3b82f6" />}
              bgColor="#dbeafe"
              change={stats.totalOrdersChange}
            />
            <StatCard
              title="Customers"
              value={stats.totalCustomers}
              icon={<Feather name="users" size={18} color="#8b5cf6" />}
              bgColor="#ede9fe"
              change={stats.customersChange}
            />
            <StatCard
              title="Pending"
              value={stats.pendingOrders}
              icon={<Feather name="clock" size={18} color="#f59e0b" />}
              bgColor="#fef3c7"
              change={stats.pendingChange}
            />
            <StatCard
              title="Delivered"
              value={stats.deliveredOrders}
              icon={<Feather name="check-circle" size={18} color="#10b981" />}
              bgColor="#d1fae5"
            />
          </ScrollView>

          {/* Charts Row */}
          <View className="flex-row mb-4">
            {/* Order Status */}
            <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm mr-2" data-testid="staff-status-chart">
              <Text className="text-sm font-semibold text-gray-800 mb-3">Order Status</Text>
              <View className="items-center">
                <DonutChart data={statusDistribution} size={120} />
              </View>
              <View className="mt-3">
                {statusDistribution.map((item, index) => (
                  <View key={index} className="flex-row items-center mb-1">
                    <View style={{ backgroundColor: item.color }} className="w-2 h-2 rounded-full mr-2" />
                    <Text className="text-gray-600 text-[10px] flex-1">{item.label}</Text>
                    <Text className="text-gray-800 font-semibold text-[10px]">{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Top Customers */}
            <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm ml-2" data-testid="top-customers">
              <Text className="text-sm font-semibold text-gray-800 mb-3">Top Customers</Text>
              {topCustomers.map((customer, index) => (
                <Pressable
                  key={customer.id}
                  className="flex-row items-center py-2 border-b border-gray-100"
                  onPress={() => customer.phone && Linking.openURL(`tel:${customer.phone}`)}
                >
                  <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2">
                    <Text className="text-blue-600 font-bold text-xs">{customer.name.charAt(0)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-gray-800" numberOfLines={1}>{customer.store_name}</Text>
                    <Text className="text-[10px] text-gray-500">{customer.name}</Text>
                  </View>
                  <Ionicons name="call-outline" size={14} color="#3b82f6" />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Sales Performance Chart */}
          {/* <View className="bg-white rounded-2xl p-4 shadow-sm mb-4" data-testid="sales-performance-chart">
            <BarChart
              data={MOCK_MONTHLY_PERFORMANCE.map(d => ({ month: d.month, value: d.revenue }))}
              width={chartWidth}
              height={180}
              color="#6366f1"
              label="Monthly Sales Performance (₹)"
            />
          </View> */}

          {/* Recent Orders */}
          <View className="bg-white rounded-2xl p-4 shadow-sm mb-4" data-testid="staff-recent-orders">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-semibold text-gray-800">Recent Orders</Text>
              <Pressable onPress={() => navigation.replace('StaffOrderScreen')} data-testid="view-all-staff-orders-btn">
                <Text className="text-blue-600 text-xs font-medium">View all</Text>
              </Pressable>
            </View>

            {recentOrders.map((order, index) => (
              <View
                key={order.id}
                className={`flex-row items-center py-3 ${index !== recentOrders.length - 1 ? 'border-b border-gray-100' : ''}`}
                data-testid={`staff-order-item-${order.id}`}
              >
                <View className="bg-indigo-50 p-2 rounded-lg mr-3">
                  <Feather name="package" size={16} color="#6366f1" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">#{order.id} - {order.storeName}</Text>
                  <Text className="text-xs text-gray-500">{order.items} items · {new Date(order.date).toLocaleDateString('en-IN')}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-semibold text-gray-800">₹{order.total.toLocaleString('en-IN')}</Text>
                  <View
                    style={{ backgroundColor: STATUS_COLORS[order.status]?.bg || '#f3f4f6' }}
                    className="px-2 py-0.5 rounded-full mt-1"
                  >
                    <Text
                      style={{ color: STATUS_COLORS[order.status]?.text || '#374151' }}
                      className="text-[10px] font-medium"
                    >
                      {order.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View className="bg-white rounded-2xl p-4 shadow-sm mb-6" data-testid="staff-quick-actions">
            <Text className="text-base font-semibold text-gray-800 mb-4">Quick Actions</Text>

            <View className="flex-row mb-3">
              <Pressable
                className="flex-1 bg-indigo-600 rounded-xl py-4 px-4 flex-row items-center justify-center mr-2"
                onPress={() => navigation.replace('StaffScreen')}
                data-testid="new-order-btn"
              >
                <Feather name="plus-circle" size={18} color="white" />
                <Text className="text-white font-semibold ml-2 text-sm">New Order</Text>
              </Pressable>

              <Pressable
                className="flex-1 bg-white border border-gray-200 rounded-xl py-4 px-4 flex-row items-center justify-center ml-2"
                onPress={() => navigation.replace('StaffOrderScreen')}
                data-testid="view-orders-btn"
              >
                <Feather name="list" size={18} color="#374151" />
                <Text className="text-gray-700 font-semibold ml-2 text-sm">All Orders</Text>
              </Pressable>
            </View>

            <Pressable
              className="bg-white border border-gray-200 rounded-xl py-4 px-5 flex-row items-center justify-center"
              onPress={() => navigation.replace('StaffCartScreen')}
              data-testid="go-to-staff-cart-btn"
            >
              <Feather name="shopping-cart" size={18} color="#374151" />
              <Text className="text-gray-700 font-semibold ml-2">View Cart</Text>
            </Pressable>
          </View>

          {/* Spacer for bottom nav */}
          <View className="h-4" />
        </ScrollView>
        <Modal transparent visible={showWelcome} animationType="fade">
          <View className="flex-1 bg-black/40 justify-center items-center">
            <View className="bg-white w-[80%] rounded-2xl p-6">
              <Text className="text-xl font-bold text-center">
                Welcome back 🎉
              </Text>
              <Text className="text-center text-gray-600 mt-2">
                {user?.name}
              </Text>

              <Pressable
                onPress={() => setShowWelcome(false)}
                className="mt-5 bg-indigo-600 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold text-center">
                  Continue
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </RefreshWrapper>
      <BottomTabNavigator />
      
    </SafeAreaView>
  );
}