import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from 'components/CustomAlert';
import BottomTabNavigator from 'components/BottomTabNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { apiUrl } from 'apiurl';
import RefreshWrapper from 'components/RefreshWrapper';
import Voice from '@react-native-voice/voice';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from 'components/Navbar';

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
  image?: string;
}

const getImageSource = (img: string | null | undefined) => {
  if (!img) return undefined;
  if (img.startsWith('http')) return { uri: img };
  return { uri: `${apiUrl}/${img}` };
};

export default function RetailerHome() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [totalItems, setTotalItems] = useState(0);

  // Image modal
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        navigation.replace('Login');
        return;
      }
      const user = JSON.parse(userString);
      if (user.role !== 'retailer') {
        navigation.replace('DealerDashboard');
        return;
      }
    };
    fetchUser();
  }, []);

  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setAlertVisible(true);
  };

  // Fetch user, cart, products
  useEffect(() => {
    const fetchUserAndProducts = async () => {
      const userData = await AsyncStorage.getItem('user');
      const storedCart = await AsyncStorage.getItem('cart');

      if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        fetchProducts(parsed.dealer_id);
      }

      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        const cartWithNumberKeys: Record<number, number> = {};
        Object.keys(parsedCart).forEach((key) => {
          cartWithNumberKeys[Number(key)] = parsedCart[key];
        });
        setCart(cartWithNumberKeys);

        const total = Object.values(cartWithNumberKeys).reduce((sum, qty) => sum + qty, 0);
        setTotalItems(total);
      }
    };

    fetchUserAndProducts();
  }, []);

  // Listen to cart changes
  useEffect(() => {
    const listener = EventRegister.addEventListener('cartChanged', (totalCount: number) => {
      setTotalItems(totalCount);

      AsyncStorage.getItem('cart').then((storedCart) => {
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          const cartWithNumberKeys: Record<number, number> = {};
          Object.keys(parsedCart).forEach((key) => {
            cartWithNumberKeys[Number(key)] = parsedCart[key];
          });
          setCart(cartWithNumberKeys);
        } else {
          setCart({});
        }
      });
    }) as string;

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  // Fetch products
const fetchProducts = async (dealerId: number) => {
  try {
    const response = await fetch(`${apiUrl}/products?dealerid=${dealerId}`);
    const data = await response.json();

    const formattedProducts = data.map((item: any) => ({
      id: Number(item.id),
      name: item.name,
      brand: item.brand,
      model: item.model,
      price: Number(item.price),
      stock: item.stock,
      description: item.description,
      dealerid: item.dealerid,
      created_at: item.created_at,
      image: item.image,
    }));

    setProducts(formattedProducts);
    setFilteredProducts(formattedProducts);

    // 🔥 FILTER CART HERE
    const storedCart = await AsyncStorage.getItem('cart');
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart);
      
      const validProductIds = new Set<number>(formattedProducts.map((p: Product) => p.id));
      const cleanedCart: Record<number, number> = {};

      Object.keys(parsedCart).forEach((key) => {
        const id = Number(key);
        if (validProductIds.has(id)) {
          cleanedCart[id] = parsedCart[key];
        }
      });

      await AsyncStorage.setItem('cart', JSON.stringify(cleanedCart));
      setCart(cleanedCart);

      const total = Object.values(cleanedCart)
        .reduce((sum, qty) => sum + qty, 0);
      setTotalItems(total);
    }

  } catch (err) {
    console.error('Error fetching products:', err);
  } finally {
    setLoading(false);
  }
};


  // Search filter
  const handleSearch = (query: string) => {
    setSearch(query);
    const lowerQuery = query.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.brand.toLowerCase().includes(lowerQuery) ||
        p.model.toLowerCase().includes(lowerQuery)
    );
    setFilteredProducts(filtered);
  };

  // Update cart
  const updateCart = async (updatedCart: Record<number, number>) => {
    setCart(updatedCart);

    const totalCount = Object.values(updatedCart).reduce((sum, qty) => sum + qty, 0);
    setTotalItems(totalCount);

    const stringified: Record<string, number> = {};
    Object.keys(updatedCart).forEach((key) => {
      stringified[key] = updatedCart[Number(key)];
    });

    await AsyncStorage.setItem('cart', JSON.stringify(stringified));
  };

  const incrementQty = (productId: number) => {
    const updated = { ...cart, [productId]: (cart[productId] || 0) + 1 };
    updateCart(updated);
  };

  const decrementQty = (productId: number) => {
    const updated = { ...cart };

    if (updated[productId]) {
      updated[productId] -= 1;
      if (updated[productId] <= 0) delete updated[productId];
    }

    updateCart(updated);
  };

  const addToCart = (productId: number) => {
    const qty = cart[productId] || 0;

    if (qty > 0) {
      EventRegister.emit('cartChanged', Object.values(cart).reduce((s, n) => s + n, 0));
      showAlert('✔️ Added to cart!');
    } else {
      showAlert('⚠️ Select quantity first!');
    }
  };

  const isListening = useRef(false);

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);


  const handleVoiceCommand = async () => {
    if (isListening.current) return;

    try {
      isListening.current = true;
      await Voice.start('en-IN');
      showAlert('🎤 Listening… say product name');
    } catch (e) {
      console.error(e);
      showAlert('Voice recognition failed');
      isListening.current = false;
    }
  };

  const onSpeechResults = (event: any) => {
    const spokenText = event.value?.[0];
    if (!spokenText) return;

    console.log('🎧 Voice:', spokenText);
    processVoiceProduct(spokenText);

    isListening.current = false;
  };

  const onSpeechError = (event: any) => {
    console.error('Speech error:', event);
    showAlert('Voice error');
    isListening.current = false;
  };


  const processVoiceProduct = (spokenText: string) => {
    const cleaned = spokenText
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '');

    const product = products.find(p =>
      cleaned.includes(p.brand.toLowerCase()) &&
      cleaned.includes(p.model.toLowerCase())
    ) || products.find(p =>
      cleaned.includes(p.name.toLowerCase())
    );

    if (!product) {
      showAlert(`❌ Product not found: ${spokenText}`);
      return;
    }

    // 🔥 Add directly with qty = 1
    const updated = { ...cart, [product.id]: (cart[product.id] || 0) + 1 };
    updateCart(updated);

    showAlert(`✅ Added: ${product.name}`);
  };




  // Render product card
   const renderItem = ({ item }: { item: Product }) => (
    <View className="bg-white p-3 mb-3 rounded-xl shadow-sm">
      <View className="flex-row">
        {item.image ? (
          <Pressable
            onPress={() => {
              setModalImage(getImageSource(item.image)?.uri || null);
              setImageModalVisible(true);
            }}
          >
            <Image
              source={getImageSource(item.image)}
              className="w-24 h-24 rounded-lg mb-3 mr-4"
              resizeMode="cover"
            />
          </Pressable>
        ) : null}

        <View className="flex-1">
          {/* Product Name */}
          <Text
            className="text-md font-semibold text-gray-900"
            numberOfLines={2}
          >
            {item.name}
          </Text>

          {/* Model */}
          <Text className="text-sm text-gray-500 mt-0.5">
            {item.model}
          </Text>

          {/* Price */}
          <Text className="text-base font-bold text-blue-600 mt-1.5">
            ₹ {item.price.toLocaleString('en-IN')}
          </Text>

          {/* Actions */}
          <View className="flex-row items-center justify-between mt-3">
            {/* Quantity Controls */}
            <View className="flex-row items-center bg-gray-100 rounded-md px-4 py-1.5">
              <Pressable
                onPress={() => decrementQty(item.id)}
                className="px-2"
                hitSlop={8}
              >
                <Text className="text-2xl text-gray-700">−</Text>
              </Pressable>

              <Text className="text-lg font-medium mx-2 text-gray-900">
                {cart[item.id] ?? 0}
              </Text>

              <Pressable
                onPress={() => incrementQty(item.id)}
                className="px-2"
                hitSlop={8}
              >
                <Text className="text-2xl text-gray-700">+</Text>
              </Pressable>
            </View>

            {/* Add Button */}
            <Pressable
              onPress={() => addToCart(item.id)}
              className="bg-blue-600 px-4 py-2 rounded-md"
            >
              <Text className="text-sm font-semibold text-white">
                ADD
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  const handleRefresh = async () => {
    if (user) fetchProducts(user.dealer_id);
  };

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <Navbar user={user?.name} />
      {/* IMAGE MODAL */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setImageModalVisible(false)}
        >
          <Image
            source={{ uri: modalImage! }}
            style={{ width: '90%', height: '70%', borderRadius: 10 }}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>

      <RefreshWrapper onRefresh={handleRefresh}>
        <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>
          <Text className="text-2xl font-bold mb-2">Browse Products</Text>
          <Text className="text-gray-500 mb-4">Add phones to your cart for bulk ordering</Text>

          <View className="flex-row items-center mb-4">
            <TextInput
              placeholder="Search by name, brand, or model..."
              value={search}
              onChangeText={handleSearch}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-white"
              placeholderTextColor="#666"
            />
            <Pressable
              onPress={handleVoiceCommand}
              className="bg-blue-600 p-3 rounded-full ml-2"
              data-testid="voice-search-btn"
            >
              <Ionicons name="mic" size={20} color="#fff" />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#5b74f1" />
          ) : filteredProducts.length === 0 ? (
            <Text className="text-center text-gray-500 mt-20">No products found.</Text>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              scrollEnabled={false}
            />
          )}

          <CustomAlert
            visible={alertVisible}
            message={alertMsg}
            onClose={() => setAlertVisible(false)}
          />
          
          {/* Bottom spacing for tab bar */}
          <View className="h-4" />
        </ScrollView>
      </RefreshWrapper>

      <BottomTabNavigator />
    </SafeAreaView>
  );
}