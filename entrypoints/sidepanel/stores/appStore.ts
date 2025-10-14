import { writable, derived } from 'svelte/store';
import type { Settings, MonitorState, WatchedName } from '../../../types/index.js';
import { DEFAULT_SETTINGS } from '../../../types/index.js';
import { MessagingService } from '../utils/messaging.js';

// アプリケーションの状態
interface AppState {
  settings: Settings;
  monitorState: MonitorState;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

// 初期状態
const initialState: AppState = {
  settings: DEFAULT_SETTINGS,
  monitorState: {
    statuses: [],
    isActive: false,
    lastScan: 0
  },
  isLoading: true,
  error: null,
  isConnected: false
};

// メインストア
export const appState = writable<AppState>(initialState);

// MessagingServiceのインスタンス
const messagingService = new MessagingService();

// 派生ストア
export const settings = derived(appState, $state => $state.settings);
export const monitorState = derived(appState, $state => $state.monitorState);
export const isLoading = derived(appState, $state => $state.isLoading);
export const error = derived(appState, $state => $state.error);
export const isConnected = derived(appState, $state => $state.isConnected);

/**
 * アプリケーションストアの管理クラス
 */
export class AppStore {
  private unsubscribeMessage: (() => void) | null = null;

  /**
   * アプリケーションを初期化
   */
  async initialize(): Promise<void> {
    try {
      appState.update(state => ({ ...state, isLoading: true, error: null }));

      // Background Scriptからの設定と状態を取得
      const [settings, monitorState] = await Promise.all([
        messagingService.getSettings(),
        messagingService.getStatus()
      ]);

      // Background Scriptからのメッセージを受信
      this.unsubscribeMessage = messagingService.onMessage((message) => {
        if (message.type === 'STATUS_UPDATE') {
          appState.update(state => ({
            ...state,
            monitorState: message.payload
          }));
        }
      });

      appState.update(state => ({
        ...state,
        settings,
        monitorState,
        isLoading: false,
        isConnected: true
      }));

    } catch (error) {
      console.error('Failed to initialize app:', error);
      appState.update(state => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isConnected: false
      }));
    }
  }

  /**
   * 設定を更新
   */
  async updateSettings(newSettings: Settings): Promise<void> {
    try {
      appState.update(state => ({ ...state, isLoading: true, error: null }));

      await messagingService.updateSettings(newSettings);

      appState.update(state => ({
        ...state,
        settings: newSettings,
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to update settings:', error);
      appState.update(state => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      }));
      throw error;
    }
  }

  /**
   * 監視対象名前を追加
   */
  async addWatchedName(name: string, exactMatch: boolean = false): Promise<void> {
    const currentSettings = await this.getCurrentSettings();
    const newWatchedName: WatchedName = {
      id: `watched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      exactMatch,
      enabled: true
    };

    const updatedSettings: Settings = {
      ...currentSettings,
      watchedNames: [...currentSettings.watchedNames, newWatchedName]
    };

    await this.updateSettings(updatedSettings);
  }

  /**
   * 監視対象名前を削除
   */
  async removeWatchedName(id: string): Promise<void> {
    const currentSettings = await this.getCurrentSettings();
    const updatedSettings: Settings = {
      ...currentSettings,
      watchedNames: currentSettings.watchedNames.filter(name => name.id !== id)
    };

    await this.updateSettings(updatedSettings);
  }

  /**
   * 監視対象名前を更新
   */
  async updateWatchedName(id: string, updates: Partial<Omit<WatchedName, 'id'>>): Promise<void> {
    const currentSettings = await this.getCurrentSettings();
    const updatedSettings: Settings = {
      ...currentSettings,
      watchedNames: currentSettings.watchedNames.map(name =>
        name.id === id ? { ...name, ...updates } : name
      )
    };

    await this.updateSettings(updatedSettings);
  }

  /**
   * 監視を開始
   */
  async startMonitoring(): Promise<void> {
    try {
      await messagingService.startMonitoring();
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      appState.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Failed to start monitoring'
      }));
      throw error;
    }
  }

  /**
   * 監視を停止
   */
  async stopMonitoring(): Promise<void> {
    try {
      await messagingService.stopMonitoring();
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      appState.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Failed to stop monitoring'
      }));
      throw error;
    }
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    appState.update(state => ({ ...state, error: null }));
  }

  /**
   * 現在の設定を取得
   */
  private async getCurrentSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      const unsubscribe = settings.subscribe(currentSettings => {
        unsubscribe();
        resolve(currentSettings);
      });
    });
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    if (this.unsubscribeMessage) {
      this.unsubscribeMessage();
      this.unsubscribeMessage = null;
    }
    messagingService.cleanup();
  }
}

// グローバルストアインスタンス
export const appStore = new AppStore();