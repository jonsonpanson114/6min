
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error: any) {
  console.error("Critical mounting error:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; font-family: sans-serif;">
      <h2 style="margin-top: 0;">起動エラーが発生しました</h2>
      <p>アプリケーションを読み込むことができませんでした。</p>
      <pre style="white-space: pre-wrap; word-break: break-all;">${error.message}</pre>
    </div>
  `;
}
