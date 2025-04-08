import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export default function TabsLayout() {
  useEffect(() => {
    async function configureNotifications() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('You need to enable notifications for reminders!');
      }
    }
    configureNotifications();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hide header for all tab screens
        tabBarStyle: { display: 'none' }, // Hide the bottom tab bar
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      {/* Add more screens here later if needed */}
    </Tabs>
  );
}