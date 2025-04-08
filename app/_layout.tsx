import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import * as Notifications from 'expo-notifications';

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
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