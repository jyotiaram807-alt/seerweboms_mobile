// components/CustomAlert.tsx
import React, { useEffect } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export default function CustomAlert({
  visible,
  title = 'Alert',
  message,
  onClose,
}: CustomAlertProps) {
  useEffect(() => {
    // Optional: any side effect when alert becomes visible
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-center items-center">
        <View className="bg-white w-[80%] rounded-2xl p-6 shadow-lg">
          <Text className="text-lg font-bold mb-2 text-center">{title}</Text>
          <Text className="text-gray-700 text-center mb-6">{message}</Text>

          <View className="flex-row justify-center">
            <Pressable
              onPress={onClose}
              className="bg-indigo-500 px-6 py-2 rounded-xl"
            >
              <Text className="text-white font-semibold text-center">OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
