// RefreshWrapper.tsx
import React, { ReactNode, useState, useCallback } from 'react';
import { ScrollView, RefreshControl } from 'react-native';

interface RefreshWrapperProps {
  children: ReactNode;          // Type for React children
  onRefresh?: () => Promise<void> | void;  // Optional async or sync function
}

const RefreshWrapper: React.FC<RefreshWrapperProps> = ({ children, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {children}
    </ScrollView>
  );
};

export default RefreshWrapper;
