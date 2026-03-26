import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import RefreshWrapper from 'components/RefreshWrapper';
import BottomTabNavigator from 'components/BottomTabNavigator';
import Svg, { Path, Circle, G, Text as SvgText, Line, Rect } from 'react-native-svg';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from 'components/Navbar';
import { apiGet } from '@/lib/services/api';
import { apiUrl } from 'apiurl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Order {
  id: number;
  items: number;
  date: string;
  total: number;
  status: string;
  storeName: string;
}

interface ApiOrder {
  createdAt: string;
  status: string;
  total: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  change?: number; // Percentage change vs last month
  changeLabel?: string; // e.g., "vs last month"
}

interface LastMonthStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  inTransit: number;
  totalRevenue: number;
}

// Line Chart Component
interface LineChartProps {
  data: { month: string; value: number }[];
  width: number;
  height: number;
  color: string;
  label: string;
}

// Donut Chart Component
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size: number;
}


const StatCard: React.FC<StatCardProps> = ({ title, value, icon, bgColor, change, changeLabel = 'vs last month' }) => {
  const isPositive = change !== undefined && change >= 0;
  const isNegative = change !== undefined && change < 0;
  const changeColor = isPositive ? '#10b981' : '#ef4444'; // green for growth, red for decline
  const changeIcon = isPositive ? '↑' : '↓';
  const formattedChange = change !== undefined ? `${isPositive ? '+' : ''}${change.toFixed(1)}%` : null;

  return (
      <View className="bg-white rounded-2xl p-4 shadow-sm flex-1 mx-1 min-w-[140px]" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-gray-500 text-xs font-medium">{title}</Text>
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
                {changeIcon} {formattedChange}
              </Text>
            </View>
            <Text className="text-gray-400 text-[10px] ml-1">{changeLabel}</Text>
          </View>
        )}
      </View>
  );
};


const DonutChart: React.FC<DonutChartProps> = ({ data, size }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = size / 2 - 20;
  const innerRadius = radius * 0.6;
  const center = size / 2;

  let currentAngle = -90;

  const paths = data.map((item, index) => {
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
      <SvgText
        x={center}
        y={center - 8}
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
        fill="#1f2937"
      >
        {total}
      </SvgText>
      <SvgText
        x={center}
        y={center + 12}
        textAnchor="middle"
        fontSize="10"
        fill="#6b7280"
      >
        Orders
      </SvgText>
    </Svg>
  );
};


const LineChart: React.FC<LineChartProps> = ({ data, width, height, color, label }) => {

  // Prevent crash if data is empty or only one point
  if (!data || data.length < 2) {
    return (
      <View>
        <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
        <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
          <Text className="text-gray-400 text-xs">No chart data available</Text>
        </View>
      </View>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
  const minValue = 0;

  const xStep = chartWidth / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - ((d.value - minValue) / (maxValue - minValue)) * chartHeight,
    value: d.value,
    month: d.month,
  }));

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaPath = `
    ${linePath}
    L ${points[points.length - 1].x} ${padding.top + chartHeight}
    L ${points[0].x} ${padding.top + chartHeight}
    Z
  `;

  return (
    <View>
      <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>

      <Svg width={width} height={height}>

        {/* Grid Lines */}
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
              x={padding.left - 8}
              y={padding.top + chartHeight * (1 - ratio) + 4}
              textAnchor="end"
              fontSize="9"
              fill="#9ca3af"
            >
              {Math.round(maxValue * ratio)}
            </SvgText>
          </G>
        ))}

        {/* Area */}
        <Path d={areaPath} fill={color} opacity={0.1} />

        {/* Line */}
        <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" />

        {/* Points */}
        {points.map((p, i) => (
          <G key={i}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={2}
            />

            <SvgText
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {p.month}
            </SvgText>
          </G>
        ))}

      </Svg>
    </View>
  );
};


const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#dbeafe', text: '#1e40af' },
  dispatched: { bg: '#e0e7ff', text: '#3730a3' },
  delivered: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

export default function RetailerDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastMonthStats, setLastMonthStats] = useState<LastMonthStats | null>(null);

  const fetchOrders = async (retailerId: number) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        console.error("No token found. Please login again.");
        return;
      }

      const data = await apiGet(`/orders?retailerId=${retailerId}`, token);

      if (!Array.isArray(data)) {
        console.error("Invalid orders response", data);
        return;
      }

      const formatted = data.map((item: any) => ({
        id: item.id,
        items: item.items?.length || 0,
        date: item.createdAt,
        total: Number(item.total),
        status: item.status || "pending",
        storeName: item.retailerName || "",
      }));

      setOrders(formatted);

    } catch (err) {
      console.error("Order fetch error:", err);
    }
  };

  function getLastMonthStats(data: ApiOrder[]): {
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    inTransit: number;
    totalRevenue: number;
  } 
  {

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let totalOrders = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;
    let inTransit = 0;
    let totalRevenue = 0;

    data.forEach(order => {

      const orderDate = new Date(order.createdAt);

      if (orderDate >= lastMonth && orderDate <= lastMonthEnd) {

        totalOrders++;

        if (order.status === "pending") pendingOrders++;
        if (order.status === "delivered") deliveredOrders++;
        if (order.status === "in_transit") inTransit++;

        totalRevenue += parseFloat(order.total);
      }

    });

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      inTransit,
      totalRevenue
    };
  }

  useEffect(() => {
    if (!user?.id) return;

    fetch(`${apiUrl}/orders?retailerId=${user.id}`)
      .then(res => res.json())
      .then(data => {

        const stats = getLastMonthStats(data);

        setLastMonthStats(stats);

      });

  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const userString = await AsyncStorage.getItem('user');

      if (!userString) {
        navigation.navigate('Login' as never);
        return;
      }

      const userData = JSON.parse(userString);

      if (userData.role !== 'retailer') {
        navigation.navigate('DealerDashboard' as never);
        return;
      }

      setUser(userData);

      await fetchOrders(userData.id);

      setLoading(false);
        };

        fetchUser();

  }, []);

  function getMonthlyOrders({ data }: { data: any[]; }) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const monthCount: Record<string, number> = {};

    data.forEach((order: any) => {
        const date = new Date(order.createdAt);
        const month = months[date.getMonth()];

        if (!monthCount[month]) {
          monthCount[month] = 0;
        }

        monthCount[month]++;
    });

    const result = Object.keys(monthCount).map(month => ({
      month: month,
      orders: monthCount[month]
    }));

    return result;
  }

  const [orderTrends, setOrderTrends] = useState<{ month: string; orders: number }[]>([]);
  useEffect(() => {
    if (user?.id) {
      fetch(`${apiUrl}/orders?retailerId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          const trends = getMonthlyOrders({ data });
          setOrderTrends(trends);
        });
    }
  }, [user]);

    // Calculate statistics with comparison to last month
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const inTransit = orders.filter(o => o.status === 'dispatched').length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    // Calculate percentage changes vs last month
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return { 
      totalOrders, 
      pendingOrders, 
      deliveredOrders, 
      inTransit, 
      totalRevenue,
      // Percentage changes
      totalOrdersChange: calcChange(totalOrders, lastMonthStats?.totalOrders || 0),
      pendingOrdersChange: calcChange(pendingOrders, lastMonthStats?.pendingOrders || 0),
      deliveredOrdersChange: calcChange(deliveredOrders, lastMonthStats?.deliveredOrders || 0),
      inTransitChange: calcChange(inTransit, lastMonthStats?.inTransit || 0),
      revenueChange: calcChange(totalRevenue, lastMonthStats?.totalRevenue || 0),
    };
  }, [orders]);



    // Donut chart data
  const statusDistribution = useMemo(() => [
    { label: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: '#f59e0b' },
    { label: 'Approved', value: orders.filter(o => o.status === 'approved').length, color: '#3b82f6' },
    // { label: 'Dispatched', value: orders.filter(o => o.status === 'dispatched').length, color: '#6366f1' },
    { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: '#10b981' },
  ], [orders]);

  const recentOrders = useMemo(() => 
    [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4),
    [orders]
  );

  const handleRefresh = async () => {
    if (!user?.id) return;

    setLoading(true);
    await fetchOrders(user.id);
    setLoading(false);
  };

  const chartWidth = SCREEN_WIDTH - 64;

  if (loading) {
    return (
      <SafeAreaView className="flex-1" edges={['top']}>
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
              icon={<Feather name="shopping-cart" size={18} color="#3b82f6" />}
              color="#3b82f6"
              bgColor="#dbeafe"
              change={stats.totalOrdersChange}
            />
            <StatCard
              title="Pending Orders"
              value={stats.pendingOrders}
              icon={<Feather name="clock" size={18} color="#f59e0b" />}
              color="#f59e0b"
              bgColor="#fef3c7"
              change={stats.pendingOrdersChange}
            />
            <StatCard
              title="Delivered"
              value={stats.deliveredOrders}
              icon={<Feather name="check-circle" size={18} color="#10b981" />}
              color="#10b981"
              bgColor="#d1fae5"
              change={stats.deliveredOrdersChange}
            />
            <StatCard
              title="In Transit"
              value={stats.inTransit}
              icon={<Feather name="truck" size={18} color="#6366f1" />}
              color="#6366f1"
              bgColor="#e0e7ff"
              change={stats.inTransitChange}
            />
          </ScrollView>

          {/* Charts Section */}
          <View className="mb-6">
            {/* Order Status Distribution */}
            <View className="bg-white rounded-2xl p-4 shadow-sm mb-4" data-testid="status-chart">
              <Text className="text-base font-semibold text-gray-800 mb-4">Order Status Distribution</Text>
              <View className="flex-row items-center justify-between">
                <DonutChart data={statusDistribution} size={140} />
                <View className="flex-1 ml-4">
                  {statusDistribution.map((item, index) => (
                    <View key={index} className="flex-row items-center mb-2">
                      <View style={{ backgroundColor: item.color }} className="w-3 h-3 rounded-full mr-2" />
                      <Text className="text-gray-600 text-xs flex-1">{item.label}</Text>
                      <Text className="text-gray-800 font-semibold text-xs">{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Monthly Order Trends */}
            <View className="bg-white rounded-2xl p-4 shadow-sm mb-4" data-testid="order-trends-chart">
              <LineChart
                data={orderTrends.map(d => ({ month: d.month, value: d.orders }))}
                width={chartWidth}
                height={200}
                color="#3b82f6"
                label="Monthly Order Trends"
              />
            </View>
          </View>

          {/* Recent Orders & Quick Actions */}
          <View className="flex-row mb-6">
            {/* Recent Orders */}
            <View className="flex-1 mr-2">
              <View className="bg-white rounded-2xl p-4 shadow-sm" data-testid="recent-orders">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-base font-semibold text-gray-800">Recent Orders</Text>
                  <Pressable onPress={() => navigation.replace('RetailerOrderScreen')} data-testid="view-all-orders-btn">
                    <Text className="text-blue-600 text-xs font-medium">View all</Text>
                  </Pressable>
                </View>

                {recentOrders.map((order, index) => (
                  <View 
                    key={order.id} 
                    className={`flex-row items-center py-3 ${index !== recentOrders.length - 1 ? 'border-b border-gray-100' : ''}`}
                    data-testid={`order-item-${order.id}`}
                  >
                    <View className="bg-blue-50 p-2 rounded-lg mr-3">
                      <Feather name="package" size={16} color="#3b82f6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-800">Order #{order.id}</Text>
                      <Text className="text-xs text-gray-500">{order.items} items · {new Date(order.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-semibold text-gray-800">
                        ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
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
            </View>
          </View>

          {/* Quick Actions */}
          <View className="bg-white rounded-2xl p-4 shadow-sm mb-8" data-testid="quick-actions">
            <Text className="text-base font-semibold text-gray-800 mb-4">Quick Actions</Text>
            
            <Pressable 
              className="bg-blue-600 rounded-xl py-4 px-5 flex-row items-center justify-center mb-3"
              onPress={() => navigation.navigate('RetailerHome')}
              data-testid="browse-products-btn"
            >
              <Ionicons name="grid-outline" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Browse Products</Text>
            </Pressable>

            <Pressable 
              className="bg-white border border-gray-200 rounded-xl py-4 px-5 flex-row items-center justify-center mb-3"
              onPress={() => navigation.navigate('RetailerOrderScreen')}
              data-testid="view-all-orders-action-btn"
            >
              <Feather name="shopping-cart" size={20} color="#374151" />
              <Text className="text-gray-700 font-semibold ml-2">View All Orders</Text>
            </Pressable>

            <Pressable 
              className="bg-white border border-gray-200 rounded-xl py-4 px-5 flex-row items-center justify-center"
              onPress={() => navigation.navigate('Cart')}
              data-testid="go-to-cart-btn"
            >
              <Feather name="shopping-bag" size={20} color="#374151" />
              <Text className="text-gray-700 font-semibold ml-2">Go to Cart</Text>
            </Pressable>
          </View>

          {/* Bottom Spacing */}
          <View className="h-4" />
        </ScrollView>
      </RefreshWrapper>
      <BottomTabNavigator />
    </SafeAreaView>
  );
}
