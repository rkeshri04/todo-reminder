import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTIFICATION_MESSAGES = [
  // Morning messages
  [
    "🐾 Your pet is waiting to see you take on today's tasks!",
    "⚡ Quick check-in! Your productivity buddy needs your attention",
    "🚀 Morning momentum starts here - your pet is counting on you!",
    "👀 Your virtual pet is looking for you. Are your tasks done?",
    "⏰ Task check: Your pet's mood changes with your productivity",
  ],
  // Evening messages
  [
    "🌟 End the day strong - your pet's mood depends on your progress!",
    "🔍 Your pet is analyzing your productivity... Time to improve!",
    "✨ Your pet misses you! Take 30 seconds to update your tasks",
    "📊 Your productivity score is being calculated. Check in now!",
    "🏆 Quick win: Update a task and make your pet happier!",
  ],
];

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show notifications even when app is in foreground
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useDailyNotifications() {
  useEffect(() => {
    const scheduleDailyNotifications = async () => {
      try {
        // Check if notifications are already scheduled
        const isScheduled = await AsyncStorage.getItem('notificationsScheduled');
        if (isScheduled === 'true') {
          console.log('Notifications already scheduled, skipping...');
          return;
        }

        // Check and request notification permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Notification permissions not granted');
          return;
        }

        // Cancel all existing notifications
        console.log('Cancelling existing notifications...');
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Morning notification (9:00 AM)
        const morningMessages = NOTIFICATION_MESSAGES[0];
        const randomMorningMessage = morningMessages[Math.floor(Math.random() * morningMessages.length)];

        const morningId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Todo Reminder",
            body: randomMorningMessage,
            sound: true,
          },
          trigger: {
            hour: 9,
            minute: 0,
            repeats: true,
          },
        });

        // Evening notification (6:30 PM)
        const eveningMessages = NOTIFICATION_MESSAGES[1];
        const randomEveningMessage = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];

        const eveningId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Evening Todo Reminder",
            body: randomEveningMessage,
            sound: true,
          },
          trigger: {
            hour: 17,
            minute: 35,
            repeats: true,
          },
        });

        console.log('Daily notifications scheduled:');
        console.log(`- Morning (9:00 AM) ID: ${morningId}`);
        console.log(`- Evening (6:30 PM) ID: ${eveningId}`);

        // Mark notifications as scheduled
        await AsyncStorage.setItem('notificationsScheduled', 'true');

        // Verify scheduled notifications
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`Total scheduled notifications: ${scheduledNotifications.length}`);
        scheduledNotifications.forEach((notification, index) => {
          console.log(`Notification ${index + 1}:`);
          console.log(`- Title: ${notification.content.title}`);
          console.log(`- Body: ${notification.content.body}`);
          console.log(`- Trigger: ${JSON.stringify(notification.trigger)}`);
        });

        // Notification listeners
        const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
          console.log("Notification received at", new Date().toLocaleString());
          console.log("Details:", notification);
        });

        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
          console.log("Notification response received at", new Date().toLocaleString());
          console.log("Response:", response);
        });

        // Cleanup listeners on unmount
        return () => {
          receivedSubscription.remove();
          responseSubscription.remove();
        };
      } catch (error) {
        console.error('Error scheduling notifications:', error);
      }
    };

    scheduleDailyNotifications();
  }, []);
}