/**
 * Soul Canvas - Google Apps Script Backend (FINAL VERSION)
 * 
 * これをGoogle Apps Script（GAS）のエディタに全て上書きペーストして保存・デプロイしてください。
 * 設定した「ウェブアプリのURL」を .env の VITE_GAS_URL に設定することで連携が完了します。
 */

const AUTH_TOKEN = "jonsonpanson"; // [.env] の GAS_AUTH_TOKEN と一致させてください

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

    // 2. プッシュ通知の購読登録
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

function handleSaveContent(params) {
  const folderName = params.app_name || "AntigravityApps";
  const contentType = params.content_type || "default";
  const title = params.title || "Untitled";
  const content = params.content || "";

  // フォルダの準備
  let folder = getFolder(folderName);
  let subFolder = getSubFolder(folder, contentType);

  // ファイルの作成
  const fileName = title + ".md";
  subFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);

  return response({ ok: true });
}

function handleSubscribe(params) {
  const subscription = params.subscription;
  if (!subscription) return response({ error: "Missing subscription" }, 400);

  const sheet = getOrCreateSheet("PushSubscriptions");
  
  // 重複チェック（エンドポイントで判定）
  const subObj = JSON.parse(subscription);
  const endpoint = subObj.endpoint;
  const data = sheet.getDataRange().getValues();
  let exists = false;
  
  for (let i = 1; i < data.length; i++) {
    const existingSub = JSON.parse(data[i][2]);
    if (existingSub.endpoint === endpoint) {
      // 更新（必要なら日付などを更新）
      sheet.getRange(i + 1, 1).setValue(new Date());
      exists = true;
      break;
    }
  }

  if (!exists) {
    sheet.appendRow([new Date(), params.app_name, subscription]);
  }

  return response({ ok: true });
}

function handleGetSubscriptions(params) {
  const sheet = getOrCreateSheet("PushSubscriptions");
  const data = sheet.getDataRange().getValues();
  
  // 1行目はヘッダーなので2行目以降の3列目（Subscription）を取得
  const subscriptions = data.slice(1).map(row => row[2]);
  
  return response({ ok: true, subscriptions: subscriptions });
}

// ヘルパー関数群
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
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // Handle standalone script
  }

  if (!ss) {
    // Search for the spreadsheet in Drive
    const files = DriveApp.getFilesByName("Soul Canvas Data");
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create("Soul Canvas Data");
    }
  }

  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(["Timestamp", "App", "SubscriptionJSON"]);
  }
  return sheet;
}
