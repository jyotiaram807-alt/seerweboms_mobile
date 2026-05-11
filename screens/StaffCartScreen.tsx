import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { MinusCircle, PlusCircle } from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import OrderSummary from 'components/OrderSummary';
import Navbar from 'components/Navbar';
import { apiUrl } from 'apiurl';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';

interface ProductDetail {
  id: number;
  name: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
  variants?: any[];
}

interface Retailer {
  id: number;
  name: string;
  store_name: string;
  phone: string;
  address: string;
  city: string;
}

export default function StaffCartScreen() {
  // ── CartContext — single source of truth for cart items ──────────────────
  const { cart, updateCartQuantity, removeFromCart, clearCart } = useCart();

  const [productDetails, setProductDetails] = useState<Record<number, ProductDetail>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);

  // Remove item confirmation modal state
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{
    productId: number;
    variantId: number;
    name: string;
  } | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── Boot: load user + retailer + product metadata ─────────────────────────
  useEffect(() => {
    const boot = async () => {
      try {
        const [userData, retailerData] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('selectedRetailer'),
        ]);

        if (!userData) { setLoading(false); return; }

        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (retailerData) {
          setSelectedRetailer(JSON.parse(retailerData));
        }

        // Fetch product details for display (name, brand, model)
        await fetchProductDetails(parsedUser.dealer_id);
      } catch (error) {
        console.error('StaffCartScreen boot error:', error);
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  const fetchProductDetails = async (dealerId: number) => {
    try {
      const res = await fetch(`${apiUrl}/products?dealerid=${dealerId}`);
      const raw = await res.json();

      // API may return array directly OR { products: [...] }
      const list: ProductDetail[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.products)
        ? raw.products
        : [];

      // Build a lookup map by product id for O(1) access
      const map: Record<number, ProductDetail> = {};
      list.forEach((p) => { map[Number(p.id)] = p; });
      setProductDetails(map);
    } catch (error) {
      console.error('Failed to fetch product details:', error);
      // Don't block the cart — items still show with prices from context
    }
  };

  // ── Cart rows: join context cart with product metadata ────────────────────
  // CRITICAL: Render from `cart` (CartContext) directly.
  // If product details haven't loaded, show item using price from context.
  const cartRows = useMemo(() => {
    return cart.map((item) => {
      const detail = productDetails[item.productId];
      const variantLabel =
        item.size || item.color
          ? [item.size, item.color].filter(Boolean).join(' / ')
          : null;

      return {
        key: `${item.productId}-${item.variantId}`,
        productId: item.productId,
        variantId: item.variantId,
        // Fall back gracefully if metadata not yet loaded
        name: detail?.name ?? `Product #${item.productId}`,
        brand: detail?.brand ?? '',
        model: detail?.model ?? '',
        variantLabel,
        price: item.price,      // always available from CartContext
        quantity: item.quantity,
      };
    });
  }, [cart, productDetails]);

  const totalItems = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity, 0),
    [cart]
  );

  const totalPrice = useMemo(
    () => cart.reduce((sum, c) => sum + c.price * c.quantity, 0),
    [cart]
  );

  // ── Cart actions ──────────────────────────────────────────────────────────
  const handleIncrement = useCallback(
    (productId: number, variantId: number, currentQty: number) => {
      updateCartQuantity(productId, variantId, Math.min(currentQty + 1, 999));
    },
    [updateCartQuantity]
  );

  const handleDecrement = useCallback(
    (productId: number, variantId: number, currentQty: number) => {
      if (currentQty <= 1) {
        removeFromCart(productId, variantId);
      } else {
        updateCartQuantity(productId, variantId, currentQty - 1);
      }
    },
    [updateCartQuantity, removeFromCart]
  );

  const handleRemoveConfirm = useCallback(
    (productId: number, variantId: number, name: string) => {
      setPendingRemove({ productId, variantId, name });
      setRemoveModalVisible(true);
    },
    []
  );

  const confirmRemove = useCallback(() => {
    if (pendingRemove) {
      removeFromCart(pendingRemove.productId, pendingRemove.variantId);
    }
    setRemoveModalVisible(false);
    setPendingRemove(null);
  }, [pendingRemove, removeFromCart]);

  const cancelRemove = useCallback(() => {
    setRemoveModalVisible(false);
    setPendingRemove(null);
  }, []);

  // ── Order submission ──────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (!user || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');

      const orderPayload = {
        retailerId: selectedRetailer?.id,
        retailerName: selectedRetailer?.store_name,
        dealerId: user.dealer_id,
        total: totalPrice,
        notes: '',
        order_by: user.role,
        order_by_id: user.id,
        items: cart.map((c) => ({
          productId: c.productId,
          ...(c.variantId !== 0 ? { variantId: c.variantId } : {}),
          quantity: c.quantity,
          price: c.price,
        })),
      };

      const res = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error('Order failed:', res.status, body);
        throw new Error('Failed to submit order');
      }

      clearCart();
      setIsModalVisible(false);
      Alert.alert('Success', 'Order submitted successfully!');
      navigation.replace('StaffOrderScreen');
    } catch (error) {
      console.error('Order submission error:', error);
      Alert.alert('Error', 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <Navbar user={user?.name} />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text className="text-2xl font-bold mb-2">Your Cart</Text>

        {/* Selected retailer banner */}
        {selectedRetailer && (
          <View className="bg-blue-50 rounded-xl p-3 mb-4 flex-row items-center">
            <Feather name="user" size={16} color="#3b82f6" />
            <Text className="ml-2 text-blue-700 font-medium">
              {selectedRetailer.store_name}
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#5b74f1" style={{ marginTop: 40 }} />
        ) : cart.length === 0 ? (
          // Check cart (from context) NOT cartRows, so empty state only shows
          // when context truly has no items (not when product metadata is missing)
          <View className="items-center justify-center mt-20">
            <Feather name="shopping-cart" size={48} color="#d1d5db" />
            <Text className="text-center text-gray-400 mt-4 text-base">
              Your cart is empty.
            </Text>
            <Text className="text-center text-gray-400 text-sm mt-1">
              Go to Customers tab to add products.
            </Text>
          </View>
        ) : (
          <>
            {cartRows.map((row) => (
              <View key={row.key} className="bg-white p-4 mb-4 rounded-xl shadow">
                <Text className="text-base font-semibold">{row.name}</Text>
                {(row.brand || row.model) && (
                  <Text className="text-gray-500 text-sm">
                    {[row.brand, row.model].filter(Boolean).join(' | ')}
                  </Text>
                )}
                {row.variantLabel && (
                  <Text className="text-xs text-indigo-500 mt-0.5">
                    {row.variantLabel}
                  </Text>
                )}

                <View className="flex-row justify-between items-center mt-3">
                  <Text className="text-blue-600 text-lg font-bold">
                    ₹{' '}
                    {row.price.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>

                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() =>
                        handleDecrement(row.productId, row.variantId, row.quantity)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MinusCircle size={24} color="#ef4444" />
                    </Pressable>
                    <Text className="mx-4 text-base font-semibold">{row.quantity}</Text>
                    <Pressable
                      onPress={() =>
                        handleIncrement(row.productId, row.variantId, row.quantity)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <PlusCircle size={24} color="#10b981" />
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() =>
                      handleRemoveConfirm(row.productId, row.variantId, row.name)
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={20} color="#ef4444" />
                  </Pressable>
                </View>

                <Text className="text-right text-sm mt-2 text-gray-600 font-medium">
                  Subtotal: ₹{' '}
                  {(row.price * row.quantity).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            ))}

            <OrderSummary
              totalItems={totalItems}
              totalPrice={totalPrice}
              onCheckout={() => setIsModalVisible(true)}
            />
          </>
        )}
      </ScrollView>

      {/* Confirm Order Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-5 rounded-xl w-80 shadow-lg">
            <Text className="text-lg font-bold mb-1 text-center">Confirm Order</Text>
            <Text className="text-gray-500 text-center text-sm mb-4">
              {totalItems} item{totalItems !== 1 ? 's' : ''} · ₹
              {totalPrice.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <View className="flex-row justify-between">
              <Pressable
                onPress={() => setIsModalVisible(false)}
                className="bg-gray-200 px-5 py-2 rounded-lg"
              >
                <Text className="text-gray-800 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitOrder}
                disabled={isSubmitting}
                className="bg-indigo-500 px-5 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">
                  {isSubmitting ? 'Submitting...' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Item Modal — same style as Confirm Order */}
      <Modal visible={removeModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-5 rounded-xl w-80 shadow-lg">
            <Text className="text-lg font-bold mb-1 text-center">Remove Item</Text>
            <Text className="text-gray-500 text-center text-sm mb-4">
              Remove "{pendingRemove?.name}" from cart?
            </Text>
            <View className="flex-row justify-between">
              <Pressable
                onPress={cancelRemove}
                className="bg-gray-200 px-5 py-2 rounded-lg"
              >
                <Text className="text-gray-800 font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmRemove}
                className="bg-red-500 px-5 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabNavigator />
    </SafeAreaView>
  );
}