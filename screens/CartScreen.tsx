import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import BottomTabNavigator from "components/BottomTabNavigator";
import OrderSummary from "components/OrderSummary";
import {
  cachedGet
} from "src/lib/services/api";
import { apiUrl as BASE_URL } from "apiurl";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "components/Navbar";
import { useCart } from "../context/CartContext";
import CustomAlert from "components/CustomAlert";
import { useCallback, useEffect, useMemo, useState } from "react";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface Product {
  id: number;
  name: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
  image?: string | null;
  variants?: any[];
}

interface CartRow {
  key: string;
  productId: number;
  variantId: number;
  name: string;
  brand: string;
  model: string;
  variantLabel: string | null;
  price: number;
  quantity: number;
  imageUri: string | null;
}

export default function CartScreen() {
  const { cart, updateCartQuantity, removeFromCart, clearCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [removeModal, setRemoveModal] = useState(false);
  
  const [removeItem, setRemoveItem] = useState<{
    productId: number;
    variantId: number;
    name: string;
  } | null>(null);

  // Image zoom modal
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const scaleValue = useState(new Animated.Value(1))[0];

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const showAlert = useCallback((msg: string) => {
    setAlertMsg(msg);
    setAlertVisible(true);
  }, []);

  const getImageUri = (img: string | null | undefined) => {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `${BASE_URL}/${img}`;
  };


  useEffect(() => {
    const boot = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (!userStr) { setLoading(false); return; }
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        await fetchProducts(parsedUser.dealer_id);
      } catch (e) {
        console.error("CartScreen boot error:", e);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  const fetchProducts = useCallback(async (dealerId: number) => {
    try {
      const token = (await AsyncStorage.getItem("token")) ?? undefined;

      const data = await cachedGet(`/products?dealerid=${dealerId}`, token);

      const list: Product[] = (data.products || data).map((item: any) => ({
        id: Number(item.id),
        name: item.name || "",
        brand: item.brand || "",
        model: item.model || "",
        price: Number(item.price),
        stock: Number(item.stock),
        image: item.image || null,
        variants: item.variants ?? [],
      }));

      setProducts(list);
    } catch (e) {
      console.error("Failed to fetch products:", e);
    }
  }, []);


  const cartRows = useMemo((): CartRow[] => 
    cart
      .map((cartItem) => {
        const product = products.find((p) => p.id === cartItem.productId);
        if (!product) return null;

        const displayPrice = cartItem.price;

        const variantLabel =
          cartItem.size || cartItem.color
            ? [cartItem.size, cartItem.color].filter(Boolean).join(" / ")
            : null;

        const imageUri = getImageUri(product.image);

        return {
          key: `${cartItem.productId}-${cartItem.variantId}`,
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          name: product.name,
          brand: product.brand,
          model: product.model,
          variantLabel,
          price: displayPrice,
          quantity: cartItem.quantity,
          imageUri,
        };
      })
      .filter(Boolean) as CartRow[]
  , [cart, products]);

  const totalItems = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((s, c) => s + c.price * c.quantity, 0), [cart]);


  const increment = (productId: number, variantId: number, currentQty: number) => {
    updateCartQuantity(productId, variantId, Math.min(currentQty + 1, 999));
  };

  const decrement = (productId: number, variantId: number, currentQty: number) => {
    if (currentQty <= 1) {
      removeFromCart(productId, variantId);
    } else {
      updateCartQuantity(productId, variantId, currentQty - 1);
    }
  };

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
        items: cart.map((c) => ({
          productId: c.productId,
          variantId: c.variantId !== 0 ? c.variantId : undefined,
          quantity: c.quantity,
          price: c.price,
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

      const responseText = await res.text();
      console.log("API Response:", responseText);

      if (!res.ok) throw new Error("Order failed");

      clearCart();
      setConfirmModal(false);
      showAlert("Order placed successfully!");
    } catch (error) {
      console.error("Order submission error:", error);
      showAlert("Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCartEmpty = cartRows.length === 0;

  return (
    <SafeAreaView className="flex-1">
      <Navbar user={user?.name} />

      <ScrollView
        className="px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <Text className="text-2xl font-bold mb-4">Your Cart</Text>

        {loading && isCartEmpty ? (
          <ActivityIndicator size="large" color="#5b74f1" />
        ) : isCartEmpty ? (
          <Text className="text-center text-gray-400 mt-20">Cart is empty</Text>
        ) : (
          cartRows.map((row) => (
            <View key={row.key} className="bg-white p-4 mb-3 rounded-xl shadow">
              <View className="flex-row items-start">
                {row.imageUri ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedImageUri(row.imageUri);
                      setImageModalVisible(true);
                      scaleValue.setValue(1);
                    }}
                  >
                    <Image
                      source={{ uri: row.imageUri }}
                      className="w-20 h-20 rounded-lg mr-3"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View className="w-20 h-20 bg-gray-100 rounded-lg mr-3 items-center justify-center">
                    <Text className="text-gray-400 text-xs">No image</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="font-semibold">{row.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    {row.brand} • {row.model}
                  </Text>
                  {row.variantLabel && (
                    <Text className="text-xs text-indigo-500 mt-0.5">
                      {row.variantLabel}
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row justify-between items-center mt-3">
                <Text className="text-blue-600 font-bold text-lg">
                  ₹{row.price.toLocaleString("en-IN")}
                </Text>

                <View className="flex-row items-center">
                  <TouchableOpacity onPress={() => decrement(p.id)}>
                    <Text>-</Text>
                  </TouchableOpacity>
                  <Text className="mx-3">{cart[p.id]}</Text>
                  <TouchableOpacity onPress={() => increment(p.id)}>
                    <Text>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setRemoveItem({
                      productId: row.productId,
                      variantId: row.variantId,
                      name: row.name,
                    });
                    setRemoveModal(true);
                  }}
                  className="ml-2"
                >
                  <Feather name="trash-2" size={20} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {!isCartEmpty && (
          <OrderSummary
            totalItems={totalItems}
            totalPrice={totalPrice}
            onCheckout={() => setConfirmModal(true)}
          />
        )}
      </ScrollView>

      {/* Confirm Order Modal */}
      <Modal transparent visible={confirmModal}>
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white p-5 rounded-xl w-80">
            <Text className="text-lg font-bold text-center mb-1">Confirm Order?</Text>
            <Text className="text-center text-gray-500 mb-4 text-sm">
              {totalItems} item{totalItems !== 1 ? "s" : ""} · ₹{totalPrice.toLocaleString("en-IN")}
            </Text>
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => setConfirmModal(false)}>
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitOrder} disabled={isSubmitting}>
                <Text className="text-blue-600 font-semibold">
                  {isSubmitting ? "Submitting…" : "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove Item Modal */}
      <Modal transparent visible={removeModal}>
        <View className="flex-1 bg-black/40 justify-center items-center">
          <View className="bg-white p-5 rounded-xl w-80">
            <Text className="text-center mb-1 font-semibold">Remove item?</Text>
            {removeItem && (
              <Text className="text-center text-gray-500 text-sm mb-4">
                {removeItem.name}
              </Text>
            )}
            <View className="flex-row justify-between">
              <TouchableOpacity onPress={() => setRemoveModal(false)}>
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (removeItem) {
                    removeFromCart(removeItem.productId, removeItem.variantId);
                  }
                  setRemoveModal(false);
                  setRemoveItem(null);
                }}
              >
                <Text className="text-red-600 font-semibold">Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Image Zoom Modal ─────────────────────────────────────── */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setImageModalVisible(false);
          setSelectedImageUri(null);
        }}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <Pressable
            className="flex-1 absolute inset-0"
            onPress={() => {
              setImageModalVisible(false);
              setSelectedImageUri(null);
            }}
          />
          <PinchGestureHandler
            onGestureEvent={Animated.event(
              [{ nativeEvent: { scale: scaleValue } }],
              { useNativeDriver: true }
            )}
          >
            <Animated.View
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                transform: [{ scale: scaleValue }],
              }}
            >
              <Image
                source={{ uri: selectedImageUri || '' }}
                className="w-[90vw] h-[70vh] max-w-full max-h-full"
                resizeMode="contain"
              />
            </Animated.View>
          </PinchGestureHandler>
        </View>
      </Modal>
       <CustomAlert
          visible={alertVisible}
          message={alertMsg}
          onClose={() => setAlertVisible(false)}
        />
      <BottomTabNavigator />
    </SafeAreaView>
  );
}
