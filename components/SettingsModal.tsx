import React, { useState } from 'react';
import { X, Bell, Sun, Moon, Clock, Check, AlertCircle } from 'lucide-react';
import { NotificationSettings } from '../types';
import {
  requestPermission,
  sendTestNotification,
  getPermissionStatus,
  isNotificationSupported,
} from '../services/notificationService';

interface SettingsModalProps {
  settings: NotificationSettings;
  onClose: () => void;
  onSave: (settings: NotificationSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onSave }) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(getPermissionStatus());

  const handleRequestPermission = async () => {
    const permission = await requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      setLocalSettings(prev => ({ ...prev, permissionRequested: true }));
    }
  };

  const handleTestNotification = () => {
    sendTestNotification();
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const formatTime = (hour: number, minute: number): string => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const handleTimeChange = (period: 'morning' | 'evening', value: string) => {
    const [hour, minute] = value.split(':').map(Number);
    setLocalSettings(prev => ({
      ...prev,
      [period]: { ...prev[period], hour, minute },
    }));
  };

  if (!isNotificationSupported()) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
        <div className="bg-[#fdfbfb] w-full max-w-md rounded-[3rem] shadow-2xl relative p-8">
          <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur rounded-full shadow-lg z-20 text-slate-400 hover:text-slate-800 transition-colors hover:scale-110">
            <X size={24} />
          </button>
          <div className="text-center space-y-4">
            <AlertCircle className="mx-auto text-amber-500" size={48} />
            <h2 className="text-2xl font-black text-slate-800">通知非対応</h2>
            <p className="text-slate-600">お使いのブラウザは通知をサポートしていません。最新版のChromeやFirefoxをご利用ください。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-500" onClick={onClose} />
      <div className="bg-[#fdfbfb] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 no-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur rounded-full shadow-lg z-20 text-slate-400 hover:text-slate-800 transition-colors hover:scale-110">
          <X size={24} />
        </button>

        <div className="p-8 md:p-10 space-y-8">
          {/* Header */}
          <div className="space-y-3 text-center border-b border-slate-100 pb-6">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl shadow-lg">
                <Bell className="text-white" size={32} />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-800">通知設定</h2>
            <p className="text-slate-500 text-sm">朝と夜のリマインダー通知を設定できます</p>
          </div>

          {/* Permission Status */}
          {permissionStatus === 'default' && (
            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-200 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-amber-500" size={24} />
                <div>
                  <p className="font-bold text-amber-800">通知権限が必要です</p>
                  <p className="text-amber-700 text-sm">リマインダー通知を受け取るには権限を許可してください</p>
                </div>
              </div>
              <button
                onClick={handleRequestPermission}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-colors"
              >
                通知を許可する
              </button>
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="bg-red-50 p-6 rounded-[2rem] border border-red-200 space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-500" size={24} />
                <div>
                  <p className="font-bold text-red-800">通知が拒否されています</p>
                  <p className="text-red-700 text-sm">ブラウザの設定から通知を許可してください</p>
                </div>
              </div>
            </div>
          )}

          {/* Master Toggle */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="text-indigo-500" size={24} />
                <div>
                  <p className="font-bold text-slate-800">通知を有効にする</p>
                  <p className="text-slate-500 text-sm">リマインダー通知を受け取る</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (permissionStatus !== 'granted') {
                    handleRequestPermission();
                  } else {
                    setLocalSettings(prev => ({ ...prev, enabled: !prev.enabled }));
                  }
                }}
                disabled={permissionStatus === 'denied'}
                className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
                  localSettings.enabled ? 'bg-indigo-500' : 'bg-slate-200'
                } ${permissionStatus === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                    localSettings.enabled ? 'left-9' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Test Notification */}
            {permissionStatus === 'granted' && (
              <button
                onClick={handleTestNotification}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Bell size={18} />
                テスト通知を送る
              </button>
            )}
          </div>

          {/* Morning Settings */}
          <div className={`bg-amber-50 p-6 rounded-[2rem] border-2 transition-all ${
            localSettings.morning.enabled ? 'border-amber-300' : 'border-transparent opacity-60'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Sun className="text-amber-600" size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">朝の通知</p>
                  <p className="text-slate-500 text-sm">今日の目標を書くリマインダー</p>
                </div>
              </div>
              <button
                onClick={() => setLocalSettings(prev => ({
                  ...prev,
                  morning: { ...prev.morning, enabled: !prev.morning.enabled }
                }))}
                disabled={!localSettings.enabled}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                  localSettings.morning.enabled ? 'bg-amber-500' : 'bg-slate-200'
                } ${!localSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                    localSettings.morning.enabled ? 'left-7' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="text-amber-500" size={18} />
              <input
                type="time"
                value={formatTime(localSettings.morning.hour, localSettings.morning.minute)}
                onChange={(e) => handleTimeChange('morning', e.target.value)}
                disabled={!localSettings.enabled || !localSettings.morning.enabled}
                className="flex-1 px-4 py-2.5 bg-white border-2 border-amber-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Evening Settings */}
          <div className={`bg-indigo-50 p-6 rounded-[2rem] border-2 transition-all ${
            localSettings.evening.enabled ? 'border-indigo-300' : 'border-transparent opacity-60'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Moon className="text-indigo-600" size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">夜の通知</p>
                  <p className="text-slate-500 text-sm">今日を振り返るリマインダー</p>
                </div>
              </div>
              <button
                onClick={() => setLocalSettings(prev => ({
                  ...prev,
                  evening: { ...prev.evening, enabled: !prev.evening.enabled }
                }))}
                disabled={!localSettings.enabled}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                  localSettings.evening.enabled ? 'bg-indigo-500' : 'bg-slate-200'
                } ${!localSettings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                    localSettings.evening.enabled ? 'left-7' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="text-indigo-500" size={18} />
              <input
                type="time"
                value={formatTime(localSettings.evening.hour, localSettings.evening.minute)}
                onChange={(e) => handleTimeChange('evening', e.target.value)}
                disabled={!localSettings.enabled || !localSettings.evening.enabled}
                className="flex-1 px-4 py-2.5 bg-white border-2 border-indigo-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-black rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Check size={24} />
            設定を保存
          </button>

          {/* Diagnostic Info (Debug) */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3 opacity-60 text-xs text-slate-400">
            <p className="font-bold flex items-center gap-1"><AlertCircle size={12} /> 診断情報 (Android通信テスト用)</p>
            <div className="bg-slate-50 p-3 rounded-lg space-y-1">
              <p>1. 権限: {permissionStatus}</p>
              <p>2. SW稼働: {'serviceWorker' in navigator ? 'OK' : '非対応'}</p>
              <p id="debug-sub-status">3. 購読: 確認中...</p>
              <script dangerouslySetInnerHTML={{ __html: `
                setTimeout(async () => {
                  try {
                    const reg = await navigator.serviceWorker.ready;
                    const sub = await reg.pushManager.getSubscription();
                    document.getElementById('debug-sub-status').innerText = '3. 購読: ' + (sub ? '登録済み' : '未登録');
                  } catch(e) {
                    document.getElementById('debug-sub-status').innerText = '3. 購読: エラー';
                  }
                }, 1000);
              `}} />
            </div>
            <p className="text-[10px] leading-tight text-center">※Androidで通知が届かない場合、ブラウザが「HTTPS」接続であること、かつ「ホーム画面に追加」して起動しているか確認してください。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
