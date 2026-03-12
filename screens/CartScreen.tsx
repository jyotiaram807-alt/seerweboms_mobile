import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventRegister } from "react-native-event-listeners";
import { MinusCircle, PlusCircle } from "lucide-react-native";
import { Feather } from "@expo/vector-icons";
import BottomTabNavigator from "components/BottomTabNavigator";
import OrderSummary from "components/OrderSummary";
import { apiUrl } from "apiurl";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "components/Navbar";

const BASE_URL = apiUrl;

/* ---------------- TYPES ---------------- */

interface Product {
  id: number;
  name: string;
  brand: string;
  model: string;
  price: number;
}

/* ---------------- SCREEN ---------------- */

export default function CartScreen() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [removeModal, setRemoveModal] = useState(false);
  const [removeItem, setRemoveItem] = useState<Product | null>(null);

  /* ---------------- LOAD CART FAST ---------------- */

  useEffect(() => {
    const loadCartInstant = async () => {
      try {
        const [userStr, cartStr, cachedProducts] = await Promise.all([
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("cart"),
          AsyncStorage.getItem("cartProducts"),
        ]);

        if (!userStr || !cartStr) {
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(userStr);
        const parsedCart = JSON.parse(cartStr);

        setUser(parsedUser);
        setCart(parsedCart);

        // ✅ INSTANT UI
        if (cachedProducts) {
          setProducts(JSON.parse(cachedProducts));
          setLoading(false);
        }

        // 🔁 BACKGROUND SYNC
        fetchFreshProducts(Object.keys(parsedCart), parsedUser.dealer_id);

      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };

    loadCartInstant();
  }, []);

  /* ---------------- BACKGROUND REFRESH ---------------- */

  const fetchFreshProducts = async (ids: string[], dealerId: number) => {
    try {
      const res = await fetch(`${BASE_URL}/products?dealerid=${dealerId}`);
      const allProducts = await res.json();

      const filtered = allProducts.filter((p: Product) =>
        ids.includes(String(p.id))
      );

      setProducts(filtered);
      await AsyncStorage.setItem("cartProducts", JSON.stringify(filtered));
    } catch (e) {
      console.error("Background refresh failed", e);
    }
  };

  /* ---------------- CART ACTIONS ---------------- */

  const updateCart = async (updated: Record<string, number>) => {
    setCart(updated);
    await AsyncStorage.setItem("cart", JSON.stringify(updated));
    EventRegister.emit(
      "cartChanged",
      Object.values(updated).reduce((s, q) => s + q, 0)
    );
  };

  const increment = (id: number) =>
    updateCart({ ...cart, [id]: (cart[id] || 0) + 1 });

  const decrement = (id: number) => {
    const copy = { ...cart };
    copy[id] > 1 ? (copy[id] -= 1) : delete copy[id];
    updateCart(copy);
    setProducts(products.filter((p) => copy[p.id]));
  };

  const removeProduct = (id: number) => {
    const copy = { ...cart };
    delete copy[id];
    updateCart(copy);
    setProducts(products.filter((p) => p.id !== id));
  };

  /* ---------------- TOTALS ---------------- */

  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);
  const totalPrice = products.reduce(
    (s, p) => s + p.price * (cart[p.id] || 0),
    0
  );

  /* ---------------- SUBMIT ORDER ---------------- */

  const submitOrder = async () => {
    if (!user || totalItems === 0) return;

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem("token");

      const payload = {
        retailerId: user.id,
        retailerName: user.name,
        dealerId: user.dealer_id,
        total: totalPrice,
        notes: "",
        order_by: user?.role,
        order_by_id: user?.id,
        items: products.map((p) => ({
          productId: p.id,
          quantity: cart[p.id],
          price: p.price,
        })),
      };

      console.log("Submitting order payload:", payload);

      const res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text(); // 👈 useful for debugging
      console.log("API Response:", responseText);

      if (!res.ok) throw new Error("Order failed");

      await AsyncStorage.multiRemove(["cart", "cartProducts"]);
      updateCart({});
      setProducts([]);
      setConfirmModal(false);

      Alert.alert("Success", "Order placed successfully");

    } catch (error) {
      console.error("Order submission error:", error);
      Alert.alert("Error", "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------- RENDER ---------------- */

  return (
    <SafeAreaView className="flex-1">
      <Navbar user={user?.name} />

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="text-2xl font-bold mb-4">Your Cart</Text>

        {loading && products.length === 0 ? (
          <ActivityIndicator size="large" color="#5b74f1" />
        ) : products.length === 0 ? (
          <Text className="text-center text-gray-400 mt-20">Cart is empty</Text>
        ) : (
          products.map((p) => (
            <View key={p.id} className="bg-white p-4 mb-3 rounded-xl shadow">
              <Text className="font-semibold">{p.name}</Text>
              <Text className="text-gray-500">{p.brand} • {p.model}</Text>

              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-blue-600 font-bold">
                  ₹ {p.price.toLocaleString("en-IN")}
                </Text>

                <View className="flex-row items-center">
                  <TouchableOpacity onPress={() => decrement(p.id)}>
                    <MinusCircle size={20} color="gray" />
                  </TouchableOpacity>
                  <Text className="mx-3">{cart[p.id]}</Text>
                  <TouchableOpacity onPress={() => increment(p.id)}>
                    <PlusCircle size={20} color="gray" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setRemoveItem(p);
                    setRemoveModal(true);
                  }}
                >
                  <Feather name="trash-2" size={18} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {products.length > 0 && (
          <OrderSummary
            totalItems={totalItems}
            totalPrice={totalPrice}
            onCheckout={() => setConfirmModal(true)}
          />
        )}
      </ScrollView>

      {/* CONFIRM ORDER */}
      <Modal transparent visible={confirmModal}>
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white p-5 rounded-xl w-80">
            <Text className="text-lg font-bold text-center mb-3">Confirm Order?</Text>
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => setConfirmModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitOrder}>
                <Text className="text-blue-600">
                  {isSubmitting ? "Submitting..." : "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REMOVE ITEM */}
      <Modal transparent visible={removeModal}>
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white p-5 rounded-xl w-80">
            <Text className="text-center mb-3">Remove item?</Text>
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => setRemoveModal(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (removeItem) removeProduct(removeItem.id);
                  setRemoveModal(false);
                }}
              >
                <Text className="text-red-600">Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabNavigator />
    </SafeAreaView>
  );
}