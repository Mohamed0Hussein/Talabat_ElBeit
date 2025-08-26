import * as Device from "expo-device";
import * as Notifications from 'expo-notifications';
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
  let token;


  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Device.isDevice) {

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notifications!");
      return;
    }


    token = (await Notifications.getExpoPushTokenAsync()).data;

  } else {
    alert("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}
// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Send push notification to specific token
export async function sendPushNotification(expoPushToken : string, title : string, body : string, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      console.error('Failed to send notification:', response.status);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Send notifications to multiple tokens
export async function sendBulkNotifications(expoPushTokens : string[], title : string, body : string, data = {}) {
  const messages = expoPushTokens
    .filter(token => token) // Remove null/undefined tokens
    .map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    }));

  if (messages.length === 0) return;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    if (!response.ok) {
      console.error('Failed to send bulk notifications:', response.status);
    }
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
  }
}

// Send local notification
export async function sendLocalNotification(title : string , body : string, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}