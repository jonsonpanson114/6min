const GAS_URL = process.env.VITE_GAS_URL || "";
const AUTH_TOKEN = process.env.GAS_AUTH_TOKEN || "jonsonpanson";
const APP_NAME = "6min";

type LogLevel = "INFO" | "WARN" | "ERROR";

export function sendLog(
  level: LogLevel,
  message: string,
  details?: unknown
) {
  // fetch(GAS_URL, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     auth_token: AUTH_TOKEN,
  //     app_name: APP_NAME,
  //     level,
  //     message,
  //     details,
  //   }),
  // }).catch((e) => {
  //   console.warn("[DriveLogger] Failed to send log:", e);
  // });
  console.log(`[DriveLogger Skipped] ${level}: ${message}`, details);
}

/**
 * コンテンツをGoogle Driveに保存
 */
export function saveContent(
  contentType: string,
  title: string,
  content: string
) {
  fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: AUTH_TOKEN,
      app_name: APP_NAME,
      action: "content",
      content_type: contentType,
      title,
      content,
    }),
  }).catch((e) => {
    console.warn("[DriveLogger] Failed to save content:", e);
  });
}
