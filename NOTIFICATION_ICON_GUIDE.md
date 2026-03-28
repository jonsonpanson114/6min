# 通知アイコンの設定ガイド

## ✅ 通知アイコンが表示されない原因と解決策

### 原因1: パスが間違っている

**問題:**
```typescript
// ❌ Service Worker基準の相対パスが解決できない
icon: '/icon.png'
icon: './icon.png'
```

**解決策:**
```typescript
// ✅ 絶対パスを使用
icon: 'https://your-domain.com/icon-512.png'
```

### 原因2: CORSの問題

**問題:**
```typescript
// ❌ 外部画像でCORSヘッダーがない
icon: 'https://example.com/icon.png'
```

**解決策:**
```typescript
// ✅ 自分のドメインのアイコンを使用
icon: 'https://your-domain.com/icon-512.png'
```

### 原因3: アイコンサイズが大きすぎる/小さすぎる

**推奨サイズ:**
| 種類 | サイズ | 形式 |
|------|--------|------|
| icon | 512x512px | PNG |
| badge | 96x96px | PNG（白背景推奨） |

**作成コマンド:**
```bash
# ImageMagickでサイズ調整
convert input.png -resize 512x512 icon-512.png
convert input.png -resize 96x96 badge-96.png
```

### 原因4: Service Workerがアイコンをキャッシュしていない

**解決策:**
```typescript
// vite.config.ts
VitePWA({
  includeAssets: ['icon-512.png', 'badge-96.png'],  // 追加
  // ...
})
```

## 📦 完全な実装例

### 1. アイコンファイル配置

```bash
public/
├── icon-512.png    # 512x512px
└── badge-96.png    # 96x96px
```

### 2. vite.config.ts

```typescript
VitePWA({
  includeAssets: ['icon-512.png', 'badge-96.png'],  // 重要
  manifest: {
    icons: [
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ]
  }
})
```

### 3. sw.ts

```typescript
self.addEventListener('push', (event) => {
  const options: NotificationOptions = {
    body: data.body,
    icon: 'https://your-domain.com/icon-512.png',  // 絶対パス
    badge: 'https://your-domain.com/badge-96.png',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

### 4. 通知サービス

```typescript
const options: NotificationOptions = {
  body,
  icon: 'https://your-domain.com/icon-512.png',  // 絶対パス
  badge: 'https://your-domain.com/badge-96.png',
};
```

## 🔍 デバッグ方法

### Chrome DevToolsで確認

1. **Applicationタブ** → **Service Workers**
2. **Push**を送ってテスト
3. **Console**でエラーを確認

```javascript
// Service Workerのパス解決を確認
console.log(location.origin);  // "https://your-domain.com"

// アイコンが読み込めるか確認
fetch('/icon-512.png').then(r => console.log(r.status));  // 200 OK?
```

### よくあるエラー

| エラー | 原因 | 解決策 |
|-------|------|--------|
| `Failed to load resource` | パスが間違っている | 絶対パスを使う |
| `CORS policy` | 外部画像のCORSがない | 自ドメインに配置 |
| 四角い箱 | アイコンが読み込めていない | 上記を確認 |

## 💡 簡易解決策

アイコンの用意が面倒な場合は、**外部サービスを使う**のが手っ取り早いです：

```typescript
// Flaticon（フリー、要アカウント）
icon: 'https://cdn-icons-png.flaticon.com/512/5904/5904053.png'

// Iconify
icon: 'https://api.iconify.design/mdi:bell.svg'

// または自分でホスティング
icon: 'https://your-cdn.com/icons/icon-512.png'
```

## ⚠️ 注意点

1. **HTTPS必須**: Service WorkerはHTTPSのみ（localhostは例外）
2. **絶対パス推奨**: 相対パスはService Workerで解決失敗することがある
3. **キャッシュ**: アイコン変更後はService Workerを更新する必要あり

## 🎨 badgeとiconの違い

- **icon**: 通知本文の横に表示される大きなアイコン
- **badge**: ステータスバーに表示される小さいアイコン（白背景推奨）

両方設定することで、より目立つ通知になります！
