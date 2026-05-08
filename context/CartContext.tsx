import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo,useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventRegister } from 'react-native-event-listeners';

// Types from ProductCart
export interface ProductVariant {
  id: number;
  size?: string;
  color?: string;
  rate?: number;
  mrp?: number;
  qty: number;
}

export interface Product {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  price: number;
  stock: number;
  description?: string;
  dealerid: number;
  image?: string | null;
  attributes?: Record<string, string>;
  business_type_id?: number | null;
  variants?: ProductVariant[];
}

export interface CartItem {
  productId: number;
  variantId: number; // 0 for simple
  size?: string;
  color?: string;
  price: number;
  quantity: number;
  stock: number;
}

type CartAction =
  | { type: 'LOAD'; payload: CartItem[] }
  | { type: 'ADD'; payload: CartItem }
  | { type: 'UPDATE'; payload: { productId: number; variantId: number; quantity: number } }
  | { type: 'REMOVE'; payload: { productId: number; variantId: number } }
  | { type: 'CLEAR' };

const CART_KEY = 'cart'; // Unified key

const cartReducer = (state: CartItem[], action: CartAction): CartItem[] => {
  // Safety net: if state is ever not an array, reset it
  const safeState = Array.isArray(state) ? state : [];

  switch (action.type) {
    case 'LOAD':
      // Guard against non-array payloads (corrupted AsyncStorage data)
      return Array.isArray(action.payload) ? action.payload : [];

    case 'ADD': {
      const existingAdd = safeState.find(
        (item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId
      );
      if (existingAdd) {
        return safeState.map((item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      }
      return [...safeState, action.payload];
    }

    case 'UPDATE':
      return safeState
        .map((item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter((item) => item.quantity > 0);

    case 'REMOVE':
      return safeState.filter(
        (item) =>
          !(
            item.productId === action.payload.productId &&
            item.variantId === action.payload.variantId
          )
      );

    case 'CLEAR':
      return [];

    default:
      return safeState;
  }
};

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: Omit<CartItem, 'stock'> & { stock?: number }) => void;
  updateCartQuantity: (productId: number, variantId: number, quantity: number) => void;
  removeFromCart: (productId: number, variantId: number) => void;
  clearCart: () => void;
  loadCart: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, dispatch] = useReducer(cartReducer, []);

  const addToCart = (
    item: Partial<CartItem> & Pick<CartItem, 'productId' | 'variantId' | 'price' | 'quantity'>
  ) => {
    dispatch({ type: 'ADD', payload: { ...item, stock: item.stock ?? 0 } as CartItem });
  };

  const updateCartQuantity = (productId: number, variantId: number, quantity: number) => {
    dispatch({ type: 'UPDATE', payload: { productId, variantId, quantity } });
  };

  const removeFromCart = (productId: number, variantId: number) => {
    dispatch({ type: 'REMOVE', payload: { productId, variantId } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR' });
    EventRegister.emit('cartChanged', 0);
  };

  const loadCart = (items: CartItem[]) => {
    // Guard before dispatching externally supplied data
    dispatch({ type: 'LOAD', payload: Array.isArray(items) ? items : [] });
  };

  // ── Load persisted cart on mount ────────────────────────────────────────────
  useEffect(() => {
    const initCart = async () => {
      try {
        const saved = await AsyncStorage.getItem(CART_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Only dispatch if the parsed value is actually an array
          if (Array.isArray(parsed)) {
            dispatch({ type: 'LOAD', payload: parsed });
          } else {
            // Corrupted data — clear the key so it doesn't persist
            await AsyncStorage.removeItem(CART_KEY);
          }
        }
      } catch (e) {
        console.error('Cart load failed:', e);
        // On parse error, wipe the bad entry
        try {
          await AsyncStorage.removeItem(CART_KEY);
        } catch (_) {}
      }
    };
    initCart();
  }, []);

  // Memoized safeCart & cartCount - compute once
  const safeCart = useMemo(() => Array.isArray(cart) ? cart : [], [cart]);
  const cartCount = useMemo(() => 
    safeCart.reduce((sum, item) => sum + item.quantity, 0), 
    [safeCart]
  );

  // Memoized stable actions
  const memoAddToCart = useCallback((
    item: Partial<CartItem> & Pick<CartItem, 'productId' | 'variantId' | 'price' | 'quantity'>
  ) => {
    dispatch({ type: 'ADD', payload: { ...item, stock: item.stock ?? 0 } as CartItem });
  }, [dispatch]);

  const memoUpdateQuantity = useCallback((
    productId: number, 
    variantId: number, 
    quantity: number
  ) => {
    dispatch({ type: 'UPDATE', payload: { productId, variantId, quantity } });
  }, [dispatch]);

  const memoRemoveFromCart = useCallback((
    productId: number, 
    variantId: number
  ) => {
    dispatch({ type: 'REMOVE', payload: { productId, variantId } });
  }, [dispatch]);

  const memoClearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    EventRegister.emit('cartChanged', 0);
    // Invalidate relevant caches (products/cart-related)
    import('../src/lib/cache').then(({ clearCache, invalidateCaches }) => {
      invalidateCaches('/products'); // Bust product caches on order clear
    });
  }, [dispatch]);

  const memoLoadCart = useCallback((items: CartItem[]) => {
    dispatch({ type: 'LOAD', payload: Array.isArray(items) ? items : [] });
  }, [dispatch]);

  // ── DEBOUNCED Persist + emit (300ms) ────────────────────────────────────────
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const saveAndEmit = async () => {
      try {
        await AsyncStorage.setItem(CART_KEY, JSON.stringify(safeCart));
        EventRegister.emit('cartChanged', cartCount);
      } catch (e) {
        console.error('Cart save failed:', e);
      }
    };

    // Debounce: wait 300ms after last change
    timeoutId = setTimeout(saveAndEmit, 300);

    return () => clearTimeout(timeoutId);
  }, [safeCart, cartCount]); // Only when actual data changes

  const value: CartContextType = {
    cart: safeCart,
    cartCount,
    addToCart: memoAddToCart,
    updateCartQuantity: memoUpdateQuantity,
    removeFromCart: memoRemoveFromCart,
    clearCart: memoClearCart,
    loadCart: memoLoadCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
  
// Stable useCart hook
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

