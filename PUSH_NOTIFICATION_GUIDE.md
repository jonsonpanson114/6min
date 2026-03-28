# Web Push通知 実装ガイド

## 🏗️ アーキテクチャ概要

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   React     │─────▶│  Vercel API  │─────▶│  GAS (Storage)│
│   Client    │      │  (Serverless)│      │  + Scheduler │
└─────────────┘      └──────────────┘      └─────────────┘
     ▲                                              │
     │                                              │
     │            Web Push                          │
     └──────────────────────────────────────────────┘
                  (Browser Push Service)
```

## 📋 実装ステップ

### ステップ1: VAPIDキー生成

```bash
# web-pushパッケージでVAPIDキーペア生成
npx web-push generate-vapid-keys

# 出力例:
# Public Key: BOzTiOA9GD5oLGFLqfedtG3O0jy_8mu1zJ-NKRCfHMFdUC-0_isHFHVKCwUI3lh-3kRnwSr-JPF0sLXem01Nfn0
# Private Key: YBVLZPkAPkIR-n6jRxYPsITU9SgfIrbpB8BUOOJGWOc
```

### ステップ2: 環境変数設定

**.env**
```env
VITE_VAPID_PUBLIC_KEY=BOzTiOA9GD5oLGFLqfedtG3O0jy_8mu1zJ-NKRCfHMFdUC-0_isHFHVKCwUI3lh-3kRnwSr-JPF0sLXem01Nfn0
VAPID_PRIVATE_KEY=YBVLZPkAPkIR-n6jRxYPsITU9SgfIrbpB8BUOOJGWOc
VITE_GAS_URL=https://script.google.com/macros/s/AKfycby.../exec
GAS_AUTH_TOKEN=your_auth_token
```

### ステップ3: TypeScript型定義

**types.ts**
```typescript
export interface NotificationSettings {
  enabled: boolean;
  morning: {
    enabled: boolean;
    hour: number;
    minute: number;
  };
  evening: {
    enabled: boolean;
    hour: number;
    minute: number;
  };
  permissionRequested: boolean;
}
```

### ステップ4: クライアント側実装（React）

**services/notificationService.ts**

#### 4-1. VAPID公開鍵の変換

```typescript
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
```

#### 4-2. プッシュ購読

```typescript
export const subscribeToPushNotifications = async (settings?: NotificationSettings) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Browser does not support Push Notifications');
    return null;
  }

  try {
    // Service Workerの準備
    const registration = await navigator.serviceWorker.ready;

    // 既存の購読を確認
    let subscription = await registration.pushManager.getSubscription();

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('VITE_VAPID_PUBLIC_KEY is missing');
    }

    // 新規購読の作成
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    // サーバーに購読情報を送信
    await sendSubscriptionToServer(subscription, settings);
    return subscription;
  } catch (error) {
    console.error('Subscription failed:', error);
    return null;
  }
};
```

#### 4-3. サーバーに購読情報を送信

```typescript
const sendSubscriptionToServer = async (subscription: PushSubscription, settings?: NotificationSettings) => {
  const response = await fetch('/api/push-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      settings: settings ? {
        morningHour: settings.morning.hour,
        morningMinute: settings.morning.minute,
        morningEnabled: settings.morning.enabled,
        eveningHour: settings.evening.hour,
        eveningMinute: settings.evening.minute,
        eveningEnabled: settings.evening.enabled,
      } : undefined
    }),
  });

  if (!response.ok) {
    throw new Error('Server response error');
  }
};
```

### ステップ5: Serverless Functions (Vercel)

#### 5-1. 購読処理API

**api/push-subscription.ts**
```typescript
import webpush from 'web-push';

const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    publicKey,
    privateKey
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, settings } = req.body;

  // データベースまたはGASに保存
  // ここではGoogle Apps Scriptを使用
  const response = await fetch(process.env.VITE_GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: process.env.GAS_AUTH_TOKEN,
      app_name: 'your-app-name',
      action: 'subscribe',
      subscription: JSON.stringify(subscription),
      settings: settings,
    }),
  });

  return res.status(200).json({ ok: true });
}
```

#### 5-2. プッシュ送信API

**api/send-push.ts**
```typescript
import webpush from 'web-push';

const publicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com',
    publicKey,
    privateKey
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, body } = req.body;

  // 全購読者を取得
  const subscriptions = await fetchSubscriptions();

  // 全員にプッシュ通知
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      return webpush.sendNotification(
        sub,
        JSON.stringify({ title, body })
      );
    })
  );

  const successes = results.filter(r => r.status === 'fulfilled').length;

  return res.status(200).json({
    ok: true,
    message: `Sent ${successes} notifications`
  });
}
```

### ステップ6: Service Worker設定

**vite.config.ts**
```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Your App Name',
        short_name: 'App',
        display: 'standalone',
        icons: [...]
      }
    })
  ]
});
```

**sw.ts** (Service Worker)
```typescript
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json();
  if (!data) return;

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});
```

### ステップ7: Google Apps Script（Cron + Storage）

**GASの機能:**
1. 購読情報をスプレッドシートに保存
2. 朝・夜の時間に合わせてCron実行
3. `api/send-push.ts`を呼び出して通知送信

## 🔍 デバッグ方法

### Chrome DevToolsで確認

1. `chrome://serviceworker-internals/` でService Worker状態確認
2. `chrome://gcm-internals/` でプッシュ通知の状態確認
3. ApplicationタブでService Workerと通知権限を確認

### よくある問題

| 問題 | 原因 | 解決策 |
|------|------|--------|
| 通知が来ない | 購読情報が保存されていない | GASでスプレッドシートを確認 |
| VAPIDエラー | キーの不一致 | 公開鍵・秘密鍵のペアを確認 |
| Service Worker動かない | ファイルパスの問題 | `sw.ts`がルートにあるか確認 |
| 複数端末で通知が来ない | 購読が1つしか保存されていない | 複数端末で購読処理を実行 |

## 🎯 この実装のメリット

1. **完全無料**: Vercel無料枠 + GAS
2. **アプリを閉じても通知が来る**: Web Push APIの威力
3. **複数デバイス対応**: 購読リスト管理
4. **スケジュール通知**: GASのCron機能

## 📦 必要なパッケージ

```bash
npm install web-push
npm install -D vite-plugin-pwa @types/web-push
```
