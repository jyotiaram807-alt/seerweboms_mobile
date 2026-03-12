// components/OrderSummary.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface OrderSummaryProps {
  totalItems: number;
  totalPrice: number;
  onCheckout: () => void;
}

export default function OrderSummary({ totalItems, totalPrice, onCheckout }: OrderSummaryProps) {
    return (
      <View className="bg-white p-4 rounded-xl shadow mt-4">
        <Text className="text-xl font-bold mb-2">Order Summary</Text>
  
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-600">Items ({totalItems})</Text>
          <Text className="text-gray-800 font-semibold">
            ₹ {totalPrice.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
  
        <View className="flex-row justify-between border-t border-gray-200 mt-2 pt-2">
          <Text className="text-lg font-bold">Total:</Text>
          <Text className="text-lg font-bold">
            ₹ {totalPrice.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
  
        <Pressable
          className="bg-indigo-500 mt-4 py-3 rounded-xl"
          onPress={onCheckout}
        >
          <Text className="text-white text-center font-bold text-base">Checkout</Text>
        </Pressable>
      </View>
    );
  }
  
