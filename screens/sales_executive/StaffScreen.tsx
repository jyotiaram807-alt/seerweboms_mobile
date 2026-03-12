import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';
import BottomTabNavigator from 'components/BottomTabNavigator';
import CustomAlert from 'components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiUrl } from 'apiurl';
import { MinusCircle, PlusCircle } from 'lucide-react-native';
import { ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from 'components/Navbar';

/* -------------------- INTERFACES -------------------- */

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
  image: string;
}

interface Retailer {
  id: number;
  name: string;
  store_name: string;
  phone: string;
  address: string;
  city: string;
}

interface ImagePopupProps {
  visible: boolean;
  image: string | null;
  onClose: () => void;
}

/* -------------------- IMAGE POPUP COMPONENT -------------------- */

const ImagePopup: React.FC<ImagePopupProps> = ({ visible, image, onClose }) => {
  if (!image) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 40,
            right: 20,
            backgroundColor: 'white',
            padding: 6,
            borderRadius: 20,
            elevation: 6,
          }}
        >
          <Ionicons name="close" size={26} color="black" />
        </Pressable>

        <Image
          source={{ uri: image }}
          style={{
            width: '80%',
            height: '60%',
            resizeMode: 'contain',
            borderRadius: 12,
            // backgroundColor: 'white',
          }}
        />
      </View>
    </Modal>
  );
};

/* -------------------- MAIN SCREEN -------------------- */

export default function StaffScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [filteredRetailers, setFilteredRetailers] = useState<Retailer[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [tempQty, setTempQty] = useState<Record<number, number>>({});
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'customers' | 'products'>('customers');

  /* -------------------- ALERT -------------------- */
  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setAlertVisible(true);
  };

  /* -------------------- RETAILER SELECTION -------------------- */
  const handleSelectRetailer = async (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    await AsyncStorage.setItem('selectedRetailer', JSON.stringify(retailer));

    // 🔥 AUTO SWITCH TO PRODUCTS TAB
    setActiveTab('products');
  };

  /* -------------------- QUANTITY INCREMENT/DECREMENT -------------------- */

  const incrementQty = (productId: number) => {
    setTempQty(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const decrementQty = (productId: number) => {
    setTempQty(prev => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  /* -------------------- LOAD CART -------------------- */
  useEffect(() => {
    const loadCart = async () => {
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        const formatted: Record<number, number> = {};
        Object.keys(parsed).forEach(k => {
          formatted[Number(k)] = parsed[k];
        });
        setCart(formatted);
        setTotalItems(Object.values(formatted).reduce((sum, q) => sum + q, 0));
      }
    };

    loadCart();

    const listener = EventRegister.addEventListener('cartChanged', async () => {
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        const formatted: Record<number, number> = {};
        Object.keys(parsed).forEach(k => {
          formatted[Number(k)] = parsed[k];
        });
        setCart(formatted);
        setTotalItems(Object.values(formatted).reduce((sum, q) => sum + q, 0));
      }
    });

    return () => {
      if (typeof listener === 'string') {
        EventRegister.removeEventListener(listener);
      }
    };
  }, []);

  /* -------------------- ADD TO CART -------------------- */

  const addToCart = async (productId: number) => {
    const qty = tempQty[productId] || 0;
    if (!qty) return showAlert('⚠️ Please select quantity before adding to cart');

    const updatedCart = { ...cart, [productId]: (cart[productId] || 0) + qty };
    setCart(updatedCart);
    setTotalItems(Object.values(updatedCart).reduce((sum, q) => sum + q, 0));

    await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    EventRegister.emit('cartChanged');

    setTempQty(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });

    showAlert('Added to cart!');
  };

  /* -------------------- SEARCH -------------------- */

  const handleRetailerSearch = (query: string) => {
    if (!query.trim()) return setFilteredRetailers(retailers);
    const lower = query.toLowerCase();

    setFilteredRetailers(
      retailers.filter(r =>
        r.name.toLowerCase().includes(lower) ||
        r.store_name.toLowerCase().includes(lower) ||
        r.phone.includes(lower) ||
        r.address.toLowerCase().includes(lower)
      )
    );
  };

  const handleProductSearch = (query: string) => {
    setSearch(query);

    if (!query.trim()) return setFilteredProducts(products);

    const lower = query.toLowerCase();

    setFilteredProducts(
      products.filter(
        p =>
          p.name.toLowerCase().includes(lower) ||
          p.brand.toLowerCase().includes(lower) ||
          p.model.toLowerCase().includes(lower)
      )
    );
  };

  /* -------------------- FETCH DATA -------------------- */

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const [userData, storedCart, token] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('cart'),
          AsyncStorage.getItem('token'),
        ]);

        if (!userData || !token) {
          navigation.navigate('Login' as never);
          return;
        }

        const userObj = JSON.parse(userData);
        setUser(userObj);

        if (userObj.role !== 'staff') {
          navigation.navigate('RetailerHome' as never);
          return;
        }

        const [retRes, prodRes] = await Promise.all([
          fetch(`${apiUrl}/staff/get_retailers_by_executive?executiveid=${userObj.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/products?dealerid=${userObj.dealer_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [retData, prodData] = await Promise.all([retRes.json(), prodRes.json()]);

        setRetailers(retData);
        setFilteredRetailers(retData);

        const formattedProducts = (prodData || []).map((item: any) => ({
          id: item.id,
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

        if (storedCart) {
          const parsedCart: Record<number, number> = {};
          const cartObj = JSON.parse(storedCart);

          Object.keys(cartObj).forEach(key => {
            parsedCart[Number(key)] = cartObj[key];
          });

          setCart(parsedCart);
          setTotalItems(Object.values(parsedCart).reduce((sum, q) => sum + q, 0));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setRetailers([]);
        setFilteredRetailers([]);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* -------------------- IMAGE SOURCE -------------------- */

  const getImageSource = (img: string | null): ImageSourcePropType | undefined => {
    if (!img) return undefined;

    if (img.startsWith("http")) return { uri: img };

    return { uri: `${apiUrl}/${img}` };
  };

  /* -------------------- PRODUCT CARD RENDER -------------------- */

  const renderProduct = ({ item }: { item: Product }) => {
    const hasImage = item.image && item.image !== '';

  return (
      <View
        style={{
          backgroundColor: '#fff',
          padding: 12,
          marginBottom: 16,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >

      
        <View style={{ flexDirection: 'row' }}>
          {hasImage && (
            <Pressable
              onPress={() => {
                setSelectedImage(`${apiUrl}/${item.image}`);
                setIsImageOpen(true);
              }}
              style={{ marginRight: 12 }}
            >
              <Image
                source={getImageSource(item.image)}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  backgroundColor: '#f3f3f3',
                }}
                resizeMode="cover"
              />
            </Pressable>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: '#6b7280', marginTop: 2 }}>{item.model}</Text>

            <Text style={{ color: '#2563eb', fontSize: 18, fontWeight: '700', marginTop: 8 }}>
              ₹ {item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => decrementQty(item.id)} style={{ padding: 4 }}>
                  <MinusCircle size={22} color="red" />
                </Pressable>

                <Text style={{ fontSize: 17, marginHorizontal: 10 }}>
                  {tempQty[item.id] || cart[item.id] || 0}
                </Text>

                <Pressable onPress={() => incrementQty(item.id)} style={{ padding: 4 }}>
                  <PlusCircle size={22} color="green" />
                </Pressable>
              </View>

              <Pressable
                style={{
                  backgroundColor: '#2563eb',
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                }}
                onPress={() => addToCart(item.id)}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Add to Cart</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  /* -------------------- MAIN RETURN -------------------- */

  return (
  <SafeAreaView className="flex-1" edges={['top']}>
    <Navbar user={user?.name} />
    {/* ---------- TOP TABS ---------- */}
    <View
      style={{
        backgroundColor: '#fff',
        padding: 12,
        margin: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
      }}
    >
      <Pressable
        onPress={() => setActiveTab('customers')}
        style={{
          backgroundColor:
            activeTab === 'customers' ? '#e5e7eb' : 'transparent',
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 10,
          marginRight: 8,
        }}
      >
        <Text style={{ fontWeight: '600' }}>Customers</Text>
      </Pressable>

      <Pressable
        onPress={() => setActiveTab('products')}
        style={{
          backgroundColor:
            activeTab === 'products' ? '#e5e7eb' : 'transparent',
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 10,
        }}
      >
        <Text style={{ fontWeight: '600' }}>Create Order</Text>
      </Pressable>
    </View>

    {/* ---------- CUSTOMERS TAB ---------- */}
    {activeTab === 'customers' && (
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text className="text-2xl font-bold mb-2">Select Customer</Text>

        <TextInput
          placeholder="Search customers..."
          className="border border-gray-300 rounded-lg px-4 py-2 mb-4 bg-white"
          onChangeText={handleRetailerSearch}
        />

        <FlatList
          data={filteredRetailers}
          keyExtractor={(r) => r.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              className={`bg-white p-4 mb-3 rounded-xl shadow ${
                selectedRetailer?.id === item.id
                  ? 'border-blue-500 border-2'
                  : ''
              }`}
              onPress={() => handleSelectRetailer(item)}
            >
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text className="font-semibold text-base">
                    {item.store_name}
                  </Text>
                  <Text className="text-gray-500 mt-1">
                    {item.name} ({item.phone})
                  </Text>
                  <Text className="text-gray-500 mt-1" numberOfLines={3}>
                    {item.address}
                  </Text>
                </View>

                {/* Call & Location Buttons */}
                <View
                  style={{
                    width: 60,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Pressable
                    onPress={() =>
                      item.phone
                        ? Linking.openURL(`tel:${item.phone}`)
                        : showAlert('Phone not available')
                    }
                    style={{
                      backgroundColor: '#3b82f6',
                      padding: 8,
                      borderRadius: 50,
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name="call" size={20} color="white" />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (item.address) {
                        const url = Platform.select({
                          ios: `maps:0,0?q=${encodeURIComponent(
                            item.address
                          )}`,
                          android: `geo:0,0?q=${encodeURIComponent(
                            item.address
                          )}`,
                        });
                        if (url) {
                          Linking.openURL(url);
                        }
                      } else showAlert('Address not available');
                    }}
                    style={{
                      backgroundColor: '#10b981',
                      padding: 8,
                      borderRadius: 50,
                    }}
                  >
                    <Ionicons name="location" size={20} color="white" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )}
        />
      </ScrollView>
    )}

    {/* ---------- PRODUCTS TAB ---------- */}
    {activeTab === 'products' && selectedRetailer && (
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Selected Customer Banner */}
        <View className="bg-blue-50 rounded-xl p-3 mb-4 flex-row items-center">
          <Ionicons name="storefront-outline" size={20} color="#3b82f6" />
          <Text className="ml-2 text-blue-700 font-medium">
            {selectedRetailer.store_name}
          </Text>
        </View>

        <Text className="text-2xl font-bold mb-2">Products</Text>

        <TextInput
          placeholder="Search products..."
          className="border border-gray-300 rounded-lg px-4 py-2 mb-4 bg-white"
          value={search}
          onChangeText={handleProductSearch}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#5b74f1" />
        ) : filteredProducts.length === 0 ? (
          <Text className="text-center text-gray-500 mt-20">
            No products found.
          </Text>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    )}

    {/* ---------- ALERT ---------- */}
    <CustomAlert
      visible={alertVisible}
      message={alertMsg}
      onClose={() => setAlertVisible(false)}
    />

    {/* ---------- IMAGE POPUP ---------- */}
    <ImagePopup
      visible={isImageOpen}
      image={selectedImage}
      onClose={() => setIsImageOpen(false)}
    />

    {/* ---------- BOTTOM NAV ---------- */}
    <BottomTabNavigator />
  </SafeAreaView>
);
}