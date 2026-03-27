/// <reference types="vite/client" />
/// <reference types="vite/client" />
import { NotificationSettings } from '../types';

let scheduledTimers: number[] = [];

export const requestPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  let permission = Notification.permission;
  if (permission !== 'granted' && permission !== 'denied') {
    permission = await Notification.requestPermission();
  }

  if (permission === 'granted') {
    try {
      await subscribeToPushNotifications();
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }

  return permission;
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Browser does not support Push Notifications');
    return null;
  }

  try {
    console.log('[Push] Registration check...');
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker Ready:', registration);

    let subscription = await registration.pushManager.getSubscription();
    console.log('[Push] Current Subscription Status:', subscription ? 'Found' : 'Not Found');

    if (subscription) {
      console.log('[Push] Refreshing existing subscription on server...');
      await sendSubscriptionToServer(subscription);
      return subscription;
    }

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error('[Push] VITE_VAPID_PUBLIC_KEY is missing in env');
      return null;
    }

    console.log('[Push] Requesting new subscription with key:', publicKey.substring(0, 10) + '...');
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    console.log('[Push] New Subscription generated:', newSubscription.endpoint);
    await sendSubscriptionToServer(newSubscription);
    return newSubscription;
  } catch (error) {
    console.error('[Push] Subscription process failed:', error);
    return null;
  }
};

const sendSubscriptionToServer = async (subscription: PushSubscription) => {
  const response = await fetch('/api/push-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error('Failed to send subscription to server');
  }

  console.log('Successfully subscribed to push notifications');
};

export const sendNotification = (title: string, body: string, onClick?: () => void): void => {
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted:', Notification.permission);
    return;
  }

  const options: NotificationOptions = {
    body,
    icon: 'https://cdn-icons-png.flaticon.com/512/5904/5904053.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/5904/5904053.png',
    tag: title,
    requireInteraction: true,
  };

  const swOptions = {
    ...options,
    vibrate: [200, 100, 200],
  };

  try {
    // Try to use Service Worker first (for PWA)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, swOptions);
        console.log('Notification sent via Service Worker:', title);
      }).catch((error) => {
        console.warn('Service Worker notification failed, falling back to direct notification:', error);
        // Fallback to direct notification
        const notification = new Notification(title, options);
        setTimeout(() => notification.close(), 5000);
      });
    } else {
      // Direct notification fallback
      const notification = new Notification(title, options);
      console.log('Notification sent directly:', title);

      if (onClick) {
        notification.onclick = () => {
          onClick();
          notification.close();
        };
      }

      setTimeout(() => notification.close(), 5000);
    }
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
};

export const sendTestNotification = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    sendNotification('テスト通知 📱', 'ブラウザがサービスワーカーをサポートしていません。');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    sendNotification('テスト通知 📱', 'まずは通知を許可して、購読を開始してください。');
    return;
  }

  try {
    const response = await fetch('/api/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'テスト通知 陣内より 📱',
        body: 'サーバーからのプッシュ信号をキャッチしたぜ。完璧だ！',
        type: 'test'
      }),
    });

    if (!response.ok) {
      throw new Error('Server returned error');
    }

    console.log('Server-side test push triggered successfully');
  } catch (error) {
    console.error('Failed to trigger server-side test push:', error);
    // Fallback to local
    sendNotification(
      'ローカル通知テスト 📱',
      'サーバー経由は失敗しましたが、ローカル通知は動作しています。'
    );
  }
};

const calculateNextTrigger = (hour: number, minute: number): number => {
  const now = new Date();
  const scheduled = new Date();

  scheduled.setHours(hour, minute, 0, 0);

  // If scheduled time has passed today, schedule for tomorrow
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return scheduled.getTime() - now.getTime();
};

const scheduleSingleNotification = (
  hour: number,
  minute: number,
  title: string,
  body: string,
  onClick?: () => void
): number => {
  // NOTE: In the new Web Push architecture, scheduling is handled by the server (Cron jobs).
  // This local timer remains as a fallback for the current session, but the real power
  // comes from api/send-push.ts.
  
  const delay = calculateNextTrigger(hour, minute);

  const timerId = window.setTimeout(() => {
    sendNotification(title, body, onClick);

    // Reschedule for next day (local fallback)
    scheduleSingleNotification(hour, minute, title, body, onClick);
  }, delay);

  scheduledTimers.push(timerId);
  return timerId;
};

export const scheduleNotifications = (
  settings: NotificationSettings,
  onMorningClick?: () => void,
  onEveningClick?: () => void
): void => {
  // Clear existing timers
  clearScheduledNotifications();

  if (!settings.enabled) {
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  // Schedule morning notification
  if (settings.morning.enabled) {
    scheduleSingleNotification(
      settings.morning.hour,
      settings.morning.minute,
      'おはようございます！🌅',
      '6分間日記の時間です。今日の感謝と目標を書きましょう。',
      onMorningClick
    );
  }

  // Schedule evening notification
  if (settings.evening.enabled) {
    scheduleSingleNotification(
      settings.evening.hour,
      settings.evening.minute,
      'おやすみなさい 🌙',
      '今日を振り返る時間です。良かったことを思い出しましょう。',
      onEveningClick
    );
  }
};

export const clearScheduledNotifications = (): void => {
  scheduledTimers.forEach(timerId => {
    clearTimeout(timerId);
  });
  scheduledTimers = [];
};

export const getPermissionStatus = (): NotificationPermission => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

// Get default notification settings
export const getDefaultNotificationSettings = (): NotificationSettings => {
  return {
    enabled: false,
    morning: {
      enabled: false,
      hour: 6,
      minute: 30,
    },
    evening: {
      enabled: false,
      hour: 22,
      minute: 0,
    },
    permissionRequested: false,
  };
};
