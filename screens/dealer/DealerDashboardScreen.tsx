import React, { useEffect, useState, useMemo } from 'react';
import { Modal, ScrollView, View, Text, TextInput, ActivityIndicator, FlatList, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Feather, Ionicons } from '@expo/vector-icons';
import NavbarScreen from '../NavbarScreen';
import { apiUrl } from 'apiurl';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

export default function DealerDashboardScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(null); 
  const [items, setItems] = useState([
    { label: 'Pending', value: 'pending', labelStyle: { color: '#facc15' } },   // yellow
    { label: 'Approved', value: 'approved', labelStyle: { color: '#3b82f6' } }, // blue
    { label: 'Dispatched', value: 'dispatched', labelStyle: { color: '#6366f1' } }, // indigo
    { label: 'Delivered', value: 'delivered', labelStyle: { color: '#22c55e' } },  // green
    { label: 'Cancelled', value: 'cancelled', labelStyle: { color: '#ef4444' } },  // red
  ]);

  const statusVariants = {
    pending: 'text-yellow-500',
    approved: 'text-blue-500',
    dispatched: 'text-indigo-500',
    delivered: 'text-green-500',
    cancelled: 'text-red-500',
  };

  type OrderStatus = "pending" | "approved" | "dispatched" | "delivered" | "cancelled";

interface Order {
  id: number;
  status: OrderStatus;
  retailerId: string;
  retailerName: string;
  dealerId: string;
  total: string;
  notes: string;
  createdAt: string;
  items: {
    productId: number;
    quantity: number;
    price: string;
    product: {
      name: string;
      price: string;
    };
  }[];
}


  const fetchUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      fetchOrders(parsed.id);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        navigation.navigate('Login' as never);
        return;
      }

      const user = JSON.parse(userString);
      if (user.role !== 'dealer') {
        navigation.navigate('StaffScreen' as never);
        return;
      }

      setUser(user.id);
    };
    fetchUser();
  }, []);

  // type OrderStatus = "pending" | "approved" | "dispatched" | "delivered" | "cancelled";

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`${apiUrl}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      const numericOrderId = Number(orderId);

      setOrders((prevOrders) =>
        prevOrders.map((order: Order) =>
          order.id === numericOrderId ? { ...order, status: newStatus } : order
        )
      );

      alert(`Order #${orderId} status changed to ${newStatus}`);
    } catch (err) {
      console.error("Status update failed:", err);
      alert("Failed to update order status");
    }
  };


  const fetchOrders = async (dealerId: number) => {
    try {
      const response = await fetch(`${apiUrl}/orders/fordealer?dealerId=${dealerId}`);
      const data = await response.json();
      // console.log('Here is my data',data)
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUser();
  }, []);
  
  useEffect(() => {
    if (selectedOrder) {
      setValue(selectedOrder.status);
    }
  }, [selectedOrder?.status]);
  
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((order) => {
      const q = search.toLowerCase();
      return (
        order.id.toString().includes(q) ||
        order.retailerName?.toLowerCase().includes(q) ||
        order.items?.some((item: any) =>
          item.product.name.toLowerCase().includes(q)
        )
      );
    });
  }, [orders, search]);


  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const totalRetailers = [...new Set(orders.map((o) => o.retailerId))].length;

  return (
  <ScrollView className="flex-1 px-4 pt-6">
    <NavbarScreen />

    {user && (
      <Text className="text-lg font-semibold text-[#566de2] mb-4">
        Welcome, {user.name} 👋
      </Text>
    )}

    {/* Stats Section */}
    <View className="space-y-4 gap-4 mb-6">
      <StatCard label="Pending Orders" value={pendingOrders} />
      <StatCard label="Active Retailers" value={totalRetailers} />
    </View>

    {/* Recent Orders */}
    <Text className="text-lg font-bold mb-2">Recent Orders</Text>
    <View className="flex-row items-center bg-white px-3 py-2 rounded-lg mb-4 shadow">
      <Ionicons name="search" size={20} color="#999" />
      <TextInput
        placeholder="Search by order ID, retailer, or product..."
        className="ml-2 flex-1 text-base"
        value={search}
        onChangeText={setSearch}
      />
    </View>

    {loading ? (
    <ActivityIndicator size="large" color="#4a3aff" />
  ) : filteredOrders.length === 0 ? (
    <Text className="text-center text-gray-500 mt-4">No orders found</Text>
  ) : (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
    >
      <View className="bg-white p-4 rounded-lg shadow">
        {/* Table Header */}
        <View className="flex flex-row border-b border-gray-300 py-2">
          <Text className="min-w-[70px] font-bold text-center">Order ID</Text>
          <Text className="min-w-[120px] font-bold text-center">Retailer</Text>
          <Text className="min-w-[70px] font-bold text-center">Item</Text>
          <Text className="min-w-[70px] font-bold text-center">Total</Text>
          <Text className="min-w-[120px] font-bold text-center">Date</Text>
          <Text className="min-w-[160px] font-bold text-center">Status</Text>
          <Text className="min-w-[80px] font-bold text-center">View</Text>
        </View>
        {/* Table Rows */}
        {filteredOrders.slice(0, 5).map((order, index) => (
          <View key={index} className="flex flex-row border-b border-gray-200 py-2">
            <Text className="min-w-[70px] text-center">{order.id}</Text>
            <Text className="min-w-[120px] text-center">{order.retailerName}</Text>
            <Text className="min-w-[70px] text-center">
              {order.items.length} {order.items.length === 1 ? "item" : "items"}
            </Text>
            <Text className="min-w-[70px] text-center">₹{(Number(order.total) || 0).toFixed(2)}</Text>
            <Text className="min-w-[120px] text-center">{new Date(order.createdAt).toLocaleDateString()}</Text>
            <View className="min-w-[160px]">
              <Picker
                selectedValue={order.status}
                onValueChange={(value) => handleStatusChange(order.id.toString(), value)}
                // style={{ height: 70 }}
                mode="dropdown"
              >
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item label="Approved" value="approved" />
                <Picker.Item label="Dispatched" value="dispatched" />
                <Picker.Item label="Delivered" value="delivered" />
                <Picker.Item label="Cancelled" value="cancelled" />
              </Picker>
            </View>
            <Pressable onPress={() => {
                setSelectedOrder(order);
                setModalVisible(true);
              }}>
                <Text className="w-[80px] text-center text-blue-600 underline">View</Text>
              </Pressable>
          </View>
        ))}
        {selectedOrder && (
              <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
              >
                <View className="flex-1 justify-center items-center bg-black/50">
                  <View className="bg-white px-6 pt-6 pb-4 rounded-xl w-80 shadow-lg relative">
                    {/* Close Icon in Top Right */}
                    <Pressable
                      className="absolute top-3 right-3"
                      onPress={() => setModalVisible(false)}
                    >
                      <Text className='text-red-500'>
                      <Feather name="x" size={20} /> {/* text-gray-600 */}
                      </Text>
                    </Pressable>

                    {/* Header */}
                    <Text className="text-center font-bold text-lg mb-4">Order Details</Text>

                    {/* Order ID + Date */}
                    <Text className="text-sm text-gray-500 mb-3">
                      Order #{String(selectedOrder.id)} - {new Date(selectedOrder.createdAt).toLocaleString()}
                    </Text>

                    {/* Items */}
                    <View className="mb-4">
                      <Text className="font-semibold mb-2">Items:</Text>
                      {selectedOrder.items.map((item, index) => (
                        <View key={index} className="flex-row justify-between mb-1">
                          <Text className="text-sm text-gray-800">
                            {item.product.name} x {item.quantity}
                          </Text>
                          <Text className="text-sm text-gray-800">
                          {(Number(item.product.price) * item.quantity).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Total */}
                    <View className="flex-row justify-between">
                      <Text className="font-bold text-base">Total:</Text>
                      <Text className="font-bold text-base">
                        ₹{selectedOrder.total ? Number(selectedOrder.total).toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
      </View>
    </ScrollView>
  )}
  </ScrollView>

)}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="bg-white p-4 rounded-lg shadow">
      <Text className="text-2xl font-bold text-[#4a3aff]">{value}</Text>
      <Text className="text-gray-500">{label}</Text>
    </View>
  );
}