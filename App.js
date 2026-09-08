import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/constants/ThemeContext';
import { getDB } from './src/database/db';
import { requestNotificationPermissions, scheduleWeeklyAlert } from './src/utils/notifications';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    (async () => {
      // Initialize DB on startup
      await getDB().catch(console.error);
      // Request notification permissions
      const granted = await requestNotificationPermissions().catch(() => false);
      // Re-arm the weekly reminder if the user had it enabled — this also refreshes
      // its "you have N events" body with the latest count on each launch.
      if (granted) {
        try {
          const enabled = await AsyncStorage.getItem('weekendAlertsEnabled');
          if (enabled === 'true') await scheduleWeeklyAlert();
        } catch {}
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
