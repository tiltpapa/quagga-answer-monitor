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
        this.safeGetSettings(),
        this.safeGetStatus()
      ]);

      // Background Scriptからのメッセージを受信
      this.unsubscribeMessage = messagingService.onMessage((message) => {
        try {
          if (message.type === 'STATUS_UPDATE') {
            appState.update(state => ({
              ...state,
              monitorState: message.payload
            }));
          } else if (message.type === 'ERROR') {
            this.handleError('Background Scriptエラー', message.payload?.message || 'エラーが発生しました');
          }
        } catch (error) {
          console.error('Error handling message:', error);
          this.handleError('メッセージ処理エラー', 'メッセージの処理中にエラーが発生しました');
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
      this.handleError('初期化エラー', 'アプリケーションの初期化に失敗しました', error);
    }
  }

  /**
   * 設定を更新
   */
  async updateSettings(newSettings: Settings): Promise<void> {
    try {
      appState.update(state => ({ ...state, isLoading: true, error: null }));

      // 設定のバリデーション
      const validationResult = this.validateSettings(newSettings);
      if (!validationResult.isValid) {
        throw new Error(`設定が無効です: ${validationResult.errors.join(', ')}`);
      }

      await messagingService.updateSettings(newSettings);

      appState.update(state => ({
        ...state,
        settings: newSettings,
        isLoading: false
      }));

    } catch (error) {
      console.error('Failed to update settings:', error);
      this.handleError('設定更新エラー', '設定の更新に失敗しました', error);
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
      appState.update(state => ({
        ...state,
        monitorState: { ...state.monitorState, isActive: true }
      }));
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      this.handleError('監視開始エラー', '監視の開始に失敗しました', error);
      throw error;
    }
  }

  /**
   * 監視を停止
   */
  async stopMonitoring(): Promise<void> {
    try {
      await messagingService.stopMonitoring();
      appState.update(state => ({
        ...state,
        monitorState: { ...state.monitorState, isActive: false }
      }));
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      this.handleError('監視停止エラー', '監視の停止に失敗しました', error);
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
   * 現在の監視状態を取得
   */
  async getStatus(): Promise<MonitorState> {
    try {
      const monitorState = await messagingService.getStatus();
      // ストアの更新は必要な場合のみ行う
      appState.update(state => {
        // 状態に変化がある場合のみ更新
        if (JSON.stringify(state.monitorState) !== JSON.stringify(monitorState)) {
          return {
            ...state,
            monitorState
          };
        }
        return state;
      });
      return monitorState;
    } catch (error) {
      console.error('Failed to get status:', error);
      throw error;
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    try {
      if (this.unsubscribeMessage) {
        this.unsubscribeMessage();
        this.unsubscribeMessage = null;
      }
      messagingService.cleanup();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * 包括的エラーハンドリング - 要件: 5.3, 5.4
   */
  private handleError(category: string, userMessage: string, error?: any): void {
    const errorDetails = {
      category,
      userMessage,
      technicalDetails: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      context: 'side_panel'
    };

    console.error(`[${category}]`, errorDetails);

    // ユーザーフレンドリーなエラーメッセージを表示
    const displayMessage = this.getUserFriendlyErrorMessage(category, userMessage);
    
    appState.update(state => ({
      ...state,
      isLoading: false,
      error: displayMessage,
      isConnected: !this.isCriticalError(category)
    }));

    // 重要なエラーの場合は追加処理
    if (this.isCriticalError(category)) {
      this.handleCriticalError(category, errorDetails);
    }
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   */
  private getUserFriendlyErrorMessage(category: string, originalMessage: string): string {
    const errorMessages: Record<string, string> = {
      '初期化エラー': 'アプリケーションの初期化に失敗しました。ページを再読み込みしてください。',
      '設定更新エラー': '設定の保存に失敗しました。もう一度お試しください。',
      '監視開始エラー': '監視の開始に失敗しました。Quaggaサイトが開いているか確認してください。',
      '監視停止エラー': '監視の停止に失敗しました。',
      'メッセージ処理エラー': '通信エラーが発生しました。ページを再読み込みしてください。',
      'Background Scriptエラー': 'システムエラーが発生しました。',
      'ストレージエラー': 'データの保存に失敗しました。ブラウザの設定を確認してください。'
    };

    return errorMessages[category] || originalMessage;
  }

  /**
   * 重要なエラーかどうかを判定
   */
  private isCriticalError(category: string): boolean {
    const criticalCategories = [
      '初期化エラー',
      'メッセージ処理エラー',
      'ストレージエラー'
    ];
    return criticalCategories.includes(category);
  }

  /**
   * 重要なエラーの処理
   */
  private handleCriticalError(category: string, errorDetails: any): void {
    console.warn('Critical error detected in side panel:', category);
    
    // 接続状態を切断に設定
    appState.update(state => ({
      ...state,
      isConnected: false
    }));

    // 必要に応じて自動復旧を試行
    if (category === '初期化エラー') {
      setTimeout(() => {
        console.log('Attempting automatic recovery...');
        this.initialize().catch(error => {
          console.error('Automatic recovery failed:', error);
        });
      }, 5000);
    }
  }

  /**
   * 安全な設定取得
   */
  private async safeGetSettings(): Promise<Settings> {
    try {
      return await messagingService.getSettings();
    } catch (error) {
      console.error('Failed to get settings, using defaults:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 安全な状態取得
   */
  private async safeGetStatus(): Promise<MonitorState> {
    try {
      return await messagingService.getStatus();
    } catch (error) {
      console.error('Failed to get status, using defaults:', error);
      return {
        statuses: [],
        isActive: false,
        lastScan: 0
      };
    }
  }

  /**
   * 設定のバリデーション
   */
  private validateSettings(settings: Settings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!settings || typeof settings !== 'object') {
      errors.push('設定オブジェクトが無効です');
      return { isValid: false, errors };
    }

    if (!Array.isArray(settings.watchedNames)) {
      errors.push('監視対象名前リストが無効です');
    } else {
      settings.watchedNames.forEach((watchedName, index) => {
        if (!watchedName.name || typeof watchedName.name !== 'string' || watchedName.name.trim() === '') {
          errors.push(`監視対象名前[${index}]: 名前が無効です`);
        }
        if (typeof watchedName.exactMatch !== 'boolean') {
          errors.push(`監視対象名前[${index}]: 完全一致フラグが無効です`);
        }
        if (typeof watchedName.enabled !== 'boolean') {
          errors.push(`監視対象名前[${index}]: 有効フラグが無効です`);
        }
      });
    }

    if (typeof settings.refreshInterval !== 'number' || settings.refreshInterval < 100) {
      errors.push('更新間隔が無効です');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// グローバルストアインスタンス
export const appStore = new AppStore();