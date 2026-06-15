import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/constants/ThemeContext';
import { getDB } from './src/database/db';
import { requestNotificationPermissions } from './src/utils/notifications';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Initialize DB on startup
    getDB().catch(console.error);
    // Request notification permissions
    requestNotificationPermissions().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
