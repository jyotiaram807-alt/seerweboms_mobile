import React, { useEffect, useState } from 'react';
import {View,Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { MinusCircle, PlusCircle } from 'lucide-react-native';
import { Feather } from "@expo/vector-icons";
import OrderSummary from 'components/OrderSummary';
import Navbar from 'components/Navbar';
import { apiUrl } from 'apiurl';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Product {
  id: number;
  name: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
  description: string;
  dealerid: number;
  created_at: string;
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
  const [cart, setCart] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCheckout = () => {
    setIsModalVisible(true); // 👈 opens the modal
  };

 useEffect(() => {
    const fetchCartData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const cartData = await AsyncStorage.getItem('cart');
        const retailerData = await AsyncStorage.getItem('selectedRetailer'); // ✅ load retailer

        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          if (cartData) {
            const parsedCart = JSON.parse(cartData);
            setCart(parsedCart);
            await fetchProductDetails(Object.keys(parsedCart), parsedUser.dealer_id);
          }
        }

        if (retailerData) {
          const parsedRetailer = JSON.parse(retailerData);
          setSelectedRetailer(parsedRetailer); // ✅ set selected retailer
        }
      } catch (error) {
        console.error('Failed to load cart or retailer:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCartData();
  }, []);


  const fetchProductDetails = async (ids: string[], dealerId: number) => {
    try {
      const res = await fetch(`${apiUrl}/products?dealerid=${dealerId}`);
      const allProducts: Product[] = await res.json();

      const filtered = allProducts.filter((p) => ids.includes(p.id.toString()));
      setProducts(filtered);
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    }
  };

  const handleIncrement = async (productId: number) => {
    const key = productId.toString(); // convert to string
    const updatedCart: Record<string, number> = {
      ...cart,
      [key]: (cart[key] || 0) + 1,
    };
  
    setCart(updatedCart);
    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    EventRegister.emit(
      'cartChanged',
      Object.values(updatedCart).reduce((sum: number, qty: number) => sum + qty, 0)
    );
  };
  

  const handleDecrement = async (productId: number) => {
    const updatedCart = { ...cart };
    if (updatedCart[productId]) {
      updatedCart[productId] -= 1;
      if (updatedCart[productId] <= 0) delete updatedCart[productId];
    }
    setCart(updatedCart);
    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    EventRegister.emit('cartChanged', Object.values(updatedCart).reduce((sum, qty) => sum + qty, 0));
  };

  const handleRemove = async (productId: number) => {
    const key = productId.toString();
    const updatedCart = { ...cart };
    delete updatedCart[key];
    
    setCart(updatedCart);
  
    // ✅ Also update products list immediately
    setProducts((prevProducts) => prevProducts.filter((p) => p.id !== productId));
  
    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
  
    EventRegister.emit(
      'cartChanged',
      Object.values(updatedCart).reduce((sum, qty) => sum + qty, 0)
    );
  };
  
  
  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = products.reduce(
    (sum, p) => sum + p.price * (cart[p.id.toString()] || 0),
    0
  );

  const handleSubmitOrder = async () => {
    if (!user || Object.keys(cart).length === 0) return;
  
    setIsSubmitting(true);
  
    try {
      const token = await AsyncStorage.getItem('token');
  
      const orderPayload = {
        retailerId: selectedRetailer?.id, // ← send as number
        retailerName: selectedRetailer?.store_name,
        dealerId: user.dealer_id, // ← send as number
        total: totalPrice,
        notes: "", // ← add this
        order_by: user?.role,
        order_by_id: user?.id,
        items: products
          .filter(p => Number(cart[p.id.toString()] || 0) > 0)
          .map((product) => ({
            productId: product.id,
            quantity: cart[product.id.toString()],
            price: product.price,
          })),
      };
        
      const res = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // if needed
        },
        body: JSON.stringify(orderPayload),
      });
  
      const responseBody = await res.text(); // debug raw text
  
      if (!res.ok) {
        console.error("Server returned:", res.status, responseBody);
        throw new Error("Failed to submit order");
      }
      
      // Clear cart
      setCart({});
      setProducts([]); // ← this is key!
      await AsyncStorage.removeItem('cart');
      EventRegister.emit('cartChanged', 0);
      Alert.alert("Success", "Order submitted successfully!");
      setIsModalVisible(false);
      navigation.replace('StaffOrderScreen')

      
    } catch (error) {
      console.error("Order submission error:", error);
      Alert.alert("Error", "Failed to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderCartItem = (product: Product) => {
    const qty = cart[product.id.toString()] || 0;
    function decrementQty(id: any): void {
      throw new Error('Function not implemented.');
    }

    return (
      <View
        key={product.id}
        className="bg-white p-4 mb-4 rounded-xl shadow"
      >
        <Text className="text-base font-semibold">{product.name}</Text>
        <Text className="text-gray-500">{product.brand} | {product.model}</Text>

        <View className="flex-row justify-between items-center mt-2">
        <Text className="text-blue-600 text-lg font-bold">
          ₹ {product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
 
          <View className="flex-row items-center">
            <TouchableOpacity className="px-4 py-1" onPress={() => handleDecrement(product.id)}>
              <MinusCircle size={20} color="red" />
            </TouchableOpacity>
            <Text className="mx-3">{qty}</Text>
            <TouchableOpacity className="px-4 py-1" onPress={() => handleIncrement(product.id)}>
              <PlusCircle size={20} color="green" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Remove Item",
              "Are you sure you want to remove this item from the cart?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  onPress: () => handleRemove(product.id),
                  style: "destructive"
                }
              ]
            )
          }
        >
          <Feather name="trash-2" size={20} color="red" />
        </TouchableOpacity>

        </View>

        <Text className="text-right text-base mt-2 text-black font-semibold">
            Subtotal: ₹ {(product.price * qty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>

      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <Navbar user={user?.name} />
    <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
      
      <Text className="text-2xl font-bold mb-2">Your Cart</Text>

      {selectedRetailer && (
        <View className="bg-blue-50 rounded-xl p-3 mb-4 flex-row items-center">
          <Feather name="user" size={16} color="#3b82f6" />
          <Text className="ml-2 text-blue-700 font-medium">{selectedRetailer.store_name}</Text>
        </View>
      )}
  
      {loading ? (
        <ActivityIndicator size="large" color="#5b74f1" />
      ) : products.length === 0 ? (
        <Text className="text-center text-gray-500 mt-20">Your cart is empty.</Text>
      ) : (
        <>
          <View>
            {products.map(renderCartItem)}
          </View>

          <OrderSummary
            totalItems={totalItems}
            totalPrice={totalPrice}
            onCheckout={handleCheckout}
          />
        </>
      )}

  
      {/* ✅ Global Modal for Checkout Confirmation */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-5 rounded-xl w-80 shadow-lg">
            <Text className="text-lg font-bold mb-2 text-center">Confirm Order</Text>
            <Text className="text-gray-600 mb-4 text-center">
              Are you sure you want to submit this order?
            </Text>
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                <Text className="text-gray-800 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitOrder}
                disabled={isSubmitting}
                className="bg-indigo-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">
                  {isSubmitting ? "Submitting..." : "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    <BottomTabNavigator />
    </SafeAreaView>
    
  );
}