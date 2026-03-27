import { NotificationSettings } from '../types';

let scheduledTimers: number[] = [];

export const requestPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
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

export const sendTestNotification = (): void => {
  sendNotification(
    'テスト通知 📱',
    '通知設定が正常に動作しています！',
    () => {
      window.focus();
    }
  );
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
  const delay = calculateNextTrigger(hour, minute);

  const timerId = window.setTimeout(() => {
    sendNotification(title, body, onClick);

    // Reschedule for next day
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
