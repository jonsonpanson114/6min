/**
 * Soul Canvas - Google Apps Script Backend (FINAL VERSION)
 * 
 * これをGoogle Apps Script（GAS）のエディタに全て上書きペーストして保存・デプロイしてください。
 * 設定した「ウェブアプリのURL」を .env の VITE_GAS_URL に設定することで連携が完了します。
 */

const AUTH_TOKEN = "jonsonpanson"; // [.env] の GAS_AUTH_TOKEN と一致させてください
const VERCEL_URL = "https://6min.vercel.app"; // お前のVercelのURLに書き換えてくれ

function doGet(e) {
  return response({ ok: true, message: "GAS is running and reachable!" });
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    
    // 簡易認証
    if (params.auth_token !== AUTH_TOKEN) {
      return response({ error: "Unauthorized" }, 401);
    }

    const action = params.action;

    // 0. 生存確認（Heartbeat）
    if (action === "ping") {
      return response({ ok: true, message: "GAS is alive and well!" });
    }

    // 1. 日記コンテンツの保存
    if (action === "content") {
      return handleSaveContent(params);
    }

    // 2. プッシュ通知の購読登録 (最新版: 時間設定も保存)
    if (action === "subscribe") {
      return handleSubscribe(params);
    }

    // 3. 購読リストの取得
    if (action === "getSubscriptions") {
      return handleGetSubscriptions(params);
    }

    return response({ error: "Unknown action" }, 400);

  } catch (error) {
    return response({ error: error.toString() }, 500);
  }
}

/**
 * 毎分または15分おきにトリガーで実行する関数
 * 各ユーザーの設定時間を確認し、合致すれば通知を送るぜ
 */
function checkAndSendNotifications() {
  const now = new Date();
  // 日本時間を基準にする
  const jstNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
  const currentHour = jstNow.getHours();
  const currentMin = jstNow.getMinutes();

  const sheet = getOrCreateSheet("PushSubscriptions");
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const subscriptionJson = row[2];
    const settingsJson = row[3];
    
    if (!settingsJson) continue;
    const settings = JSON.parse(settingsJson);

    let shouldNotify = false;
    let title = "";
    let body = "";

    // 朝の通知チェック
    if (settings.morningEnabled && settings.morningHour === currentHour && Math.abs(settings.morningMinute - currentMin) < 15) {
      // 15分以内の誤差なら送る（重複送信防止はVercel側でも考慮するが、基本1回）
      shouldNotify = true;
      title = "おはよう！Soul Canvas";
      body = "今日の気分を1分で記録して、最高のスタートを切ろうぜ。";
    }
    
    // 夜の通知チェック
    if (!shouldNotify && settings.eveningEnabled && settings.eveningHour === currentHour && Math.abs(settings.eveningMinute - currentMin) < 15) {
      shouldNotify = true;
      title = "お疲れさん。Soul Canvas";
      body = "今日起きた良いことを3つ思い出して、魂を癒やそうか。";
    }

    if (shouldNotify) {
      triggerPush(subscriptionJson, title, body);
    }
  }
}

function triggerPush(subscription, title, body) {
  const url = VERCEL_URL + "/api/send-push";
  const payload = {
    auth_token: AUTH_TOKEN,
    subscription: subscription, // 特定のデバイスに送る
    title: title,
    body: body
  };

  UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function handleSaveContent(params) {
  const folderName = params.app_name || "AntigravityApps";
  const contentType = params.content_type || "default";
  const title = params.title || "Untitled";
  const content = params.content || "";

  let folder = getFolder(folderName);
  let subFolder = getSubFolder(folder, contentType);
  const fileName = title + ".md";
  subFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);

  return response({ ok: true });
}

function handleSubscribe(params) {
  const subscription = params.subscription;
  const settings = params.settings;
  if (!subscription) return response({ error: "Missing subscription" }, 400);

  const sheet = getOrCreateSheet("PushSubscriptions");
  const subObj = JSON.parse(subscription);
  const endpoint = subObj.endpoint;
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    const existingSub = JSON.parse(data[i][2]);
    if (existingSub.endpoint === endpoint) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowValues = [
    new Date(), 
    params.app_name, 
    subscription, 
    settings ? JSON.stringify(settings) : ""
  ];

  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  return response({ ok: true });
}

function handleGetSubscriptions(params) {
  const sheet = getOrCreateSheet("PushSubscriptions");
  const data = sheet.getDataRange().getValues();
  const subscriptions = data.slice(1).map(row => row[2]);
  return response({ ok: true, subscriptions: subscriptions });
}

function response(obj, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function getSubFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

function getOrCreateSheet(name) {
  let ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) {
    const files = DriveApp.getFilesByName("Soul Canvas Data");
    if (files.hasNext()) ss = SpreadsheetApp.open(files.next());
    else ss = SpreadsheetApp.create("Soul Canvas Data");
  }

  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(["Timestamp", "App", "SubscriptionJSON", "SettingsJSON"]);
  }
  return sheet;
}
