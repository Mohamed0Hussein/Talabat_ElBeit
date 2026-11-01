import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '@/i18n';
import { buildPushMessages, chunk } from '@/lib/pushMessages';
import type { Lang, Member } from '@/lib/types';

const PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Set once, at import: show notifications that arrive while the app is open.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** This phone's Expo push token, or null on simulators, web, or when permission is refused. */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

type PushKind = 'added' | 'bought' | 'removed';

/** Tell the other members what changed, each in their own language. Failures are ignored. */
export async function notifyMembers(
  members: Member[],
  sender: { uid: string; displayName: string },
  kind: PushKind,
  itemName: string,
  familyId: string,
): Promise<void> {
  const build = (lang: Lang) => {
    const t = i18n.getFixedT(lang);
    return { title: t(`push.${kind}Title`), body: t(`push.${kind}`, { name: sender.displayName, item: itemName }) };
  };
  const messages = buildPushMessages(members, sender.uid, build, { familyId, action: kind });
  for (const batch of chunk(messages, 100)) {
    await fetch(PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => undefined);
  }
}
