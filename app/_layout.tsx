import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { cleanupCompletedTasks } from '@/store/taskSlice';

// Configure notification handler with proper settings
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // Enable badge
    priority: Notifications.AndroidNotificationPriority.HIGH, // High priority for Android
  }),
});

// Run an initial cleanup when app starts
store.dispatch(cleanupCompletedTasks());

export default function RootLayout() {
  // Perform initial cleanup on app start
  useEffect(() => {
    // Clean up any expired completed tasks on app start
    store.dispatch(cleanupCompletedTasks());
  }, []);

  return (
    <Provider store={store}>
      <Stack
        screenOptions={{
          headerShown: false, // Hide header for all screens
        }}
      />
    </Provider>
  );
}