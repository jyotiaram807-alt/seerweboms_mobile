import React from 'react';
import { View } from 'react-native';

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fc' }}>
      {children}
    </View>
  );
}
