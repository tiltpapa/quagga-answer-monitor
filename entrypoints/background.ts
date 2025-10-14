/**
 * Quagga回答監視アドオン - Background Script
 * Content ScriptとSide Panel間のメッセージルーティングと状態管理を行う
 */

/// <reference path="../types/chrome.d.ts" />
/// <reference path="../types/wxt.d.ts" />

import type { 
  Message, 
  Settings, 
  MonitorState, 
  AnswerStatus,
  GetSettingsMessage,
  UpdateSettingsMessage,
  GetStatusMessage,
  StatusUpdateMessage,
  StartMonitoringMessage,
  StopMonitoringMessage,
  ErrorMessage
} from '../types/index';
import { StorageManager } from '../utils/storage';

export default defineBackground(() => {
  console.log('Quagga Monitor Background Script loaded');
  
  // BackgroundServiceのインスタンスを作成
  const backgroundService = new BackgroundService();
  backgroundService.initialize();
});

/**
 * Background Scriptのメインサービスクラス
 */
class BackgroundService {
  private storageManager: StorageManager;
  private currentState: MonitorState;

  constructor() {
    this.storageManager = StorageManager.getInstance();
    this.currentState = {
      statuses: [],
      isActive: false,
      lastScan: 0
    };
  }

  /**
   * Background Serviceの初期化
   */
  async initialize(): Promise<void> {
    try {
      // 保存された状態を復元
      await this.restoreState();
      
      // メッセージリスナーを設定
      this.setupMessageListener();
      
      // ストレージ変更リスナーを設定
      this.setupStorageListener();
      
      console.log('Background Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Background Service:', error);
    }
  }

  /**
   * メッセージハンドリングシステムの実装
   * Content ScriptとSide Panel間のメッセージルーティング
   * 要件: 3.4, 5.3
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      console.log('Received message:', message.type, 'from:', sender.tab ? 'content script' : 'side panel');
      
      this.handleMessage(message, sender)
        .then(response => {
          console.log('Sending response:', response);
          sendResponse(response);
        })
        .catch(error => {
          console.error('Error handling message:', error);
          sendResponse({ 
            error: error.message || 'Unknown error occurred',
            success: false 
          });
        });
      
      // 非同期レスポンスを示すためtrueを返す
      return true;
    });
  }

  /**
   * メッセージタイプ別の処理分岐
   * 要件: 3.4, 5.3
   */
  private async handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<any> {
    switch (message.type) {
      case 'GET_SETTINGS':
        return await this.handleGetSettings(message as GetSettingsMessage);

      case 'UPDATE_SETTINGS':
        return await this.handleUpdateSettings(message as UpdateSettingsMessage);

      case 'GET_STATUS':
        return await this.handleGetStatus(message as GetStatusMessage);

      case 'STATUS_UPDATE':
        return await this.handleStatusUpdate(message as StatusUpdateMessage, sender);

      case 'START_MONITORING':
        return await this.handleStartMonitoring(message as StartMonitoringMessage);

      case 'STOP_MONITORING':
        return await this.handleStopMonitoring(message as StopMonitoringMessage);

      case 'ERROR':
        return await this.handleError(message as ErrorMessage, sender);

      default:
        console.warn('Unknown message type:', message.type);
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * 設定取得メッセージの処理
   */
  private async handleGetSettings(message: GetSettingsMessage): Promise<Settings> {
    try {
      const settings = await this.getValidatedSettings();
      console.log('Retrieved settings:', settings);
      return settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw new Error('設定の取得に失敗しました');
    }
  }

  /**
   * 設定更新メッセージの処理
   */
  private async handleUpdateSettings(message: UpdateSettingsMessage): Promise<{ success: boolean; settings?: Settings; errors?: string[] }> {
    try {
      if (!message.payload) {
        throw new Error('設定データが提供されていません');
      }

      const result = await this.updateValidatedSettings(message.payload);
      console.log('Settings update result:', result);

      if (result.success) {
        return { 
          success: true, 
          settings: result.settings 
        };
      } else {
        return {
          success: false,
          errors: result.errors
        };
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      return {
        success: false,
        errors: ['設定の更新に失敗しました']
      };
    }
  }

  /**
   * 状況取得メッセージの処理
   */
  private async handleGetStatus(message: GetStatusMessage): Promise<MonitorState> {
    try {
      // 最新の状態を返す
      return this.currentState;
    } catch (error) {
      console.error('Failed to get status:', error);
      throw new Error('状況の取得に失敗しました');
    }
  }

  /**
   * 状況更新メッセージの処理（Content Scriptから）
   */
  private async handleStatusUpdate(message: StatusUpdateMessage, sender: chrome.runtime.MessageSender): Promise<{ success: boolean }> {
    try {
      if (!message.payload) {
        throw new Error('状況データが提供されていません');
      }

      // Content Scriptからの更新のみ受け入れる
      if (!sender.tab) {
        console.warn('Status update from non-content script ignored');
        return { success: false };
      }

      // 現在の状態を更新
      this.currentState = {
        ...this.currentState,
        ...message.payload
      };

      // 状態を永続化
      await this.storageManager.saveMonitorState(this.currentState);

      // Side Panelに状況変更を通知
      await this.notifySidePanelStatusUpdate(this.currentState);

      console.log('Status updated:', this.currentState);
      return { success: true };
    } catch (error) {
      console.error('Failed to handle status update:', error);
      throw new Error('状況更新の処理に失敗しました');
    }
  }

  /**
   * 監視開始メッセージの処理
   */
  private async handleStartMonitoring(message: StartMonitoringMessage): Promise<{ success: boolean }> {
    try {
      // Content Scriptに監視開始を指示
      const tabs = await chrome.tabs.query({ url: '*://quagga.studio/*' });
      
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, { type: 'START_MONITORING' });
          } catch (error) {
            console.warn(`Failed to send start monitoring to tab ${tab.id}:`, error);
          }
        }
      }

      // 状態を更新
      this.currentState.isActive = true;
      await this.storageManager.saveMonitorState(this.currentState);

      console.log('Monitoring started');
      return { success: true };
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw new Error('監視の開始に失敗しました');
    }
  }

  /**
   * 監視停止メッセージの処理
   */
  private async handleStopMonitoring(message: StopMonitoringMessage): Promise<{ success: boolean }> {
    try {
      // Content Scriptに監視停止を指示
      const tabs = await chrome.tabs.query({ url: '*://quagga.studio/*' });
      
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, { type: 'STOP_MONITORING' });
          } catch (error) {
            console.warn(`Failed to send stop monitoring to tab ${tab.id}:`, error);
          }
        }
      }

      // 状態を更新
      this.currentState.isActive = false;
      await this.storageManager.saveMonitorState(this.currentState);

      console.log('Monitoring stopped');
      return { success: true };
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      throw new Error('監視の停止に失敗しました');
    }
  }

  /**
   * エラーメッセージの処理
   */
  private async handleError(message: ErrorMessage, sender: chrome.runtime.MessageSender): Promise<{ success: boolean }> {
    try {
      console.error('Received error from', sender.tab ? 'content script' : 'side panel', ':', message.payload);
      
      // Side Panelにエラーを通知（Content Scriptからのエラーの場合）
      if (sender.tab) {
        await this.notifySidePanelError(message.payload);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to handle error message:', error);
      return { success: false };
    }
  }

  /**
   * Content Scriptに設定変更を通知
   */
  private async notifyContentScriptSettingsUpdate(settings: Settings): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ url: '*://quagga.studio/*' });
      
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'UPDATE_SETTINGS',
              payload: settings
            });
          } catch (error) {
            console.warn(`Failed to notify settings update to tab ${tab.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to notify content script settings update:', error);
    }
  }

  /**
   * Side Panelに状況更新を通知
   */
  private async notifySidePanelStatusUpdate(state: MonitorState): Promise<void> {
    try {
      // Side Panelが開いているかチェックして通知
      // Note: Side Panelへの直接メッセージ送信はManifest V3では制限があるため、
      // 実際の実装ではSide Panel側からポーリングまたはストレージ変更監視を使用
      console.log('Status update ready for side panel:', state);
    } catch (error) {
      console.error('Failed to notify side panel status update:', error);
    }
  }

  /**
   * Side Panelにエラーを通知
   */
  private async notifySidePanelError(errorPayload: any): Promise<void> {
    try {
      console.log('Error ready for side panel:', errorPayload);
    } catch (error) {
      console.error('Failed to notify side panel error:', error);
    }
  }

  /**
   * ストレージ変更リスナーの設定
   */
  private setupStorageListener(): void {
    this.storageManager.addStorageListener((changes) => {
      console.log('Storage changes detected:', changes);
      
      // 状態変更があった場合は現在の状態を更新
      if (changes.quagga_monitor_state) {
        const newState = changes.quagga_monitor_state.newValue;
        if (newState) {
          this.currentState = newState;
        }
      }
    });
  }

  /**
   * 保存された状態を復元
   */
  private async restoreState(): Promise<void> {
    try {
      const savedState = await this.storageManager.getMonitorState();
      if (savedState) {
        this.currentState = savedState;
        console.log('State restored:', this.currentState);
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  // ===== 設定管理機能の実装 =====
  // 要件: 2.2, 2.3, 2.5

  /**
   * 設定の取得、更新、バリデーション
   * デフォルト設定の提供
   */
  
  /**
   * 設定のバリデーション
   */
  private validateSettings(settings: Settings): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基本構造のチェック
    if (!settings || typeof settings !== 'object') {
      errors.push('設定オブジェクトが無効です');
      return { isValid: false, errors };
    }

    // watchedNamesのバリデーション
    if (!Array.isArray(settings.watchedNames)) {
      errors.push('監視対象名前リストが配列ではありません');
    } else {
      settings.watchedNames.forEach((watchedName, index) => {
        const nameErrors = this.validateWatchedName(watchedName, index);
        errors.push(...nameErrors);
      });
    }

    // refreshIntervalのバリデーション
    if (typeof settings.refreshInterval !== 'number' || settings.refreshInterval < 100) {
      errors.push('更新間隔は100ミリ秒以上の数値である必要があります');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 監視対象名前のバリデーション
   */
  private validateWatchedName(watchedName: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `監視対象名前[${index}]: `;

    if (!watchedName || typeof watchedName !== 'object') {
      errors.push(`${prefix}オブジェクトが無効です`);
      return errors;
    }

    // IDのバリデーション
    if (!watchedName.id || typeof watchedName.id !== 'string' || watchedName.id.trim() === '') {
      errors.push(`${prefix}IDが無効です`);
    }

    // 名前のバリデーション
    if (!watchedName.name || typeof watchedName.name !== 'string' || watchedName.name.trim() === '') {
      errors.push(`${prefix}名前が無効です`);
    } else if (watchedName.name.length > 100) {
      errors.push(`${prefix}名前が長すぎます（100文字以内）`);
    }

    // exactMatchのバリデーション
    if (typeof watchedName.exactMatch !== 'boolean') {
      errors.push(`${prefix}完全一致フラグがboolean値ではありません`);
    }

    // enabledのバリデーション
    if (typeof watchedName.enabled !== 'boolean') {
      errors.push(`${prefix}有効フラグがboolean値ではありません`);
    }

    return errors;
  }

  /**
   * 設定の正規化（不正な値を修正）
   */
  private normalizeSettings(settings: Settings): Settings {
    const normalized: Settings = {
      watchedNames: [],
      refreshInterval: 1000
    };

    // watchedNamesの正規化
    if (Array.isArray(settings.watchedNames)) {
      normalized.watchedNames = settings.watchedNames
        .filter(watchedName => watchedName && typeof watchedName === 'object')
        .map(watchedName => ({
          id: String(watchedName.id || '').trim() || this.generateId(),
          name: String(watchedName.name || '').trim(),
          exactMatch: Boolean(watchedName.exactMatch),
          enabled: Boolean(watchedName.enabled)
        }))
        .filter(watchedName => watchedName.name !== ''); // 空の名前は除外
    }

    // refreshIntervalの正規化
    if (typeof settings.refreshInterval === 'number' && settings.refreshInterval >= 100) {
      normalized.refreshInterval = Math.floor(settings.refreshInterval);
    }

    return normalized;
  }

  /**
   * 一意IDの生成
   */
  private generateId(): string {
    return `watched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 設定の安全な取得（バリデーション付き）
   */
  public async getValidatedSettings(): Promise<Settings> {
    try {
      const settings = await this.storageManager.getSettings();
      const validation = this.validateSettings(settings);
      
      if (!validation.isValid) {
        console.warn('設定にエラーがあります:', validation.errors);
        // エラーがある場合は正規化して修正
        const normalizedSettings = this.normalizeSettings(settings);
        await this.storageManager.saveSettings(normalizedSettings);
        return normalizedSettings;
      }
      
      return settings;
    } catch (error) {
      console.error('設定の取得中にエラーが発生しました:', error);
      // エラーの場合はデフォルト設定を返す
      const defaultSettings = await this.storageManager.getSettings();
      return defaultSettings;
    }
  }

  /**
   * 設定の安全な更新（バリデーション付き）
   */
  public async updateValidatedSettings(newSettings: Settings): Promise<{ success: boolean; settings?: Settings; errors?: string[] }> {
    try {
      // バリデーション実行
      const validation = this.validateSettings(newSettings);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // 正規化して保存
      const normalizedSettings = this.normalizeSettings(newSettings);
      await this.storageManager.saveSettings(normalizedSettings);

      // Content Scriptに設定変更を通知
      await this.notifyContentScriptSettingsUpdate(normalizedSettings);

      console.log('設定が正常に更新されました:', normalizedSettings);
      
      return {
        success: true,
        settings: normalizedSettings
      };
    } catch (error) {
      console.error('設定の更新中にエラーが発生しました:', error);
      return {
        success: false,
        errors: ['設定の更新中にエラーが発生しました']
      };
    }
  }

  /**
   * 監視対象名前の追加
   */
  public async addWatchedName(name: string, exactMatch: boolean = false): Promise<{ success: boolean; watchedName?: any; errors?: string[] }> {
    try {
      const currentSettings = await this.getValidatedSettings();
      
      // 重複チェック
      const isDuplicate = currentSettings.watchedNames.some(
        watchedName => watchedName.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return {
          success: false,
          errors: ['同じ名前が既に登録されています']
        };
      }

      // 新しい監視対象名前を作成
      const newWatchedName = {
        id: this.generateId(),
        name: name.trim(),
        exactMatch,
        enabled: true
      };

      // 設定に追加
      const updatedSettings = {
        ...currentSettings,
        watchedNames: [...currentSettings.watchedNames, newWatchedName]
      };

      const result = await this.updateValidatedSettings(updatedSettings);
      
      if (result.success) {
        return {
          success: true,
          watchedName: newWatchedName
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('監視対象名前の追加中にエラーが発生しました:', error);
      return {
        success: false,
        errors: ['監視対象名前の追加中にエラーが発生しました']
      };
    }
  }

  /**
   * 監視対象名前の削除
   */
  public async removeWatchedName(id: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const currentSettings = await this.getValidatedSettings();
      
      // 指定されたIDの監視対象名前を削除
      const updatedWatchedNames = currentSettings.watchedNames.filter(
        watchedName => watchedName.id !== id
      );

      if (updatedWatchedNames.length === currentSettings.watchedNames.length) {
        return {
          success: false,
          errors: ['指定された監視対象名前が見つかりません']
        };
      }

      const updatedSettings = {
        ...currentSettings,
        watchedNames: updatedWatchedNames
      };

      const result = await this.updateValidatedSettings(updatedSettings);
      return result;
    } catch (error) {
      console.error('監視対象名前の削除中にエラーが発生しました:', error);
      return {
        success: false,
        errors: ['監視対象名前の削除中にエラーが発生しました']
      };
    }
  }

  /**
   * 監視対象名前の更新
   */
  public async updateWatchedName(id: string, updates: Partial<{ name: string; exactMatch: boolean; enabled: boolean }>): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const currentSettings = await this.getValidatedSettings();
      
      // 指定されたIDの監視対象名前を検索
      const watchedNameIndex = currentSettings.watchedNames.findIndex(
        watchedName => watchedName.id === id
      );

      if (watchedNameIndex === -1) {
        return {
          success: false,
          errors: ['指定された監視対象名前が見つかりません']
        };
      }

      // 名前の重複チェック（名前が変更される場合）
      if (updates.name) {
        const isDuplicate = currentSettings.watchedNames.some(
          (watchedName, index) => 
            index !== watchedNameIndex && 
            watchedName.name.toLowerCase() === updates.name!.toLowerCase()
        );
        
        if (isDuplicate) {
          return {
            success: false,
            errors: ['同じ名前が既に登録されています']
          };
        }
      }

      // 監視対象名前を更新
      const updatedWatchedNames = [...currentSettings.watchedNames];
      updatedWatchedNames[watchedNameIndex] = {
        ...updatedWatchedNames[watchedNameIndex],
        ...updates,
        name: updates.name?.trim() || updatedWatchedNames[watchedNameIndex].name
      };

      const updatedSettings = {
        ...currentSettings,
        watchedNames: updatedWatchedNames
      };

      const result = await this.updateValidatedSettings(updatedSettings);
      return result;
    } catch (error) {
      console.error('監視対象名前の更新中にエラーが発生しました:', error);
      return {
        success: false,
        errors: ['監視対象名前の更新中にエラーが発生しました']
      };
    }
  }

  /**
   * デフォルト設定の復元
   */
  public async resetToDefaultSettings(): Promise<{ success: boolean; settings?: Settings; errors?: string[] }> {
    try {
      const { DEFAULT_SETTINGS } = await import('../types/index');
      await this.storageManager.saveSettings(DEFAULT_SETTINGS);
      
      // Content Scriptに設定変更を通知
      await this.notifyContentScriptSettingsUpdate(DEFAULT_SETTINGS);

      console.log('設定をデフォルトに復元しました');
      
      return {
        success: true,
        settings: DEFAULT_SETTINGS
      };
    } catch (error) {
      console.error('デフォルト設定の復元中にエラーが発生しました:', error);
      return {
        success: false,
        errors: ['デフォルト設定の復元中にエラーが発生しました']
      };
    }
  }

  // ===== サイドパネル状態管理の実装 =====
  // 要件: 3.2, 3.4, 3.5

  /**
   * 監視状況の集約と状態更新
   * エラー状態の管理
   */

  /**
   * 監視状況の集約
   */
  public async aggregateMonitoringStatus(): Promise<MonitorState> {
    try {
      // 現在の状態をベースに集約情報を作成
      const aggregatedState: MonitorState = {
        ...this.currentState,
        lastScan: Date.now()
      };

      // 各監視対象の状況を分析
      const statusSummary = this.analyzeStatusSummary(aggregatedState.statuses);
      
      console.log('Monitoring status aggregated:', {
        totalWatched: statusSummary.totalWatched,
        foundCount: statusSummary.foundCount,
        withRightCount: statusSummary.withRightCount,
        isActive: aggregatedState.isActive
      });

      return aggregatedState;
    } catch (error) {
      console.error('Failed to aggregate monitoring status:', error);
      throw new Error('監視状況の集約に失敗しました');
    }
  }

  /**
   * 状況サマリーの分析
   */
  private analyzeStatusSummary(statuses: AnswerStatus[]): {
    totalWatched: number;
    foundCount: number;
    withRightCount: number;
    notFoundCount: number;
  } {
    const totalWatched = statuses.length;
    const foundCount = statuses.filter(status => status.found).length;
    const withRightCount = statuses.filter(status => status.found && status.hasRight).length;
    const notFoundCount = statuses.filter(status => !status.found).length;

    return {
      totalWatched,
      foundCount,
      withRightCount,
      notFoundCount
    };
  }

  /**
   * 状態の安全な更新（エラーハンドリング付き）
   */
  public async updateMonitorState(updates: Partial<MonitorState>): Promise<{ success: boolean; state?: MonitorState; errors?: string[] }> {
    try {
      // 現在の状態と更新内容をマージ
      const updatedState: MonitorState = {
        ...this.currentState,
        ...updates,
        lastScan: Date.now()
      };

      // 状態のバリデーション
      const validation = this.validateMonitorState(updatedState);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // 状態を更新
      this.currentState = updatedState;

      // 永続化
      await this.storageManager.saveMonitorState(updatedState);

      console.log('Monitor state updated successfully:', updatedState);

      return {
        success: true,
        state: updatedState
      };
    } catch (error) {
      console.error('Failed to update monitor state:', error);
      return {
        success: false,
        errors: ['監視状態の更新に失敗しました']
      };
    }
  }

  /**
   * 監視状態のバリデーション
   */
  private validateMonitorState(state: MonitorState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!state || typeof state !== 'object') {
      errors.push('監視状態オブジェクトが無効です');
      return { isValid: false, errors };
    }

    // statusesのバリデーション
    if (!Array.isArray(state.statuses)) {
      errors.push('状況リストが配列ではありません');
    } else {
      state.statuses.forEach((status, index) => {
        const statusErrors = this.validateAnswerStatus(status, index);
        errors.push(...statusErrors);
      });
    }

    // isActiveのバリデーション
    if (typeof state.isActive !== 'boolean') {
      errors.push('アクティブフラグがboolean値ではありません');
    }

    // lastScanのバリデーション
    if (typeof state.lastScan !== 'number' || state.lastScan < 0) {
      errors.push('最終スキャン時刻が無効です');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 回答状況のバリデーション
   */
  private validateAnswerStatus(status: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `回答状況[${index}]: `;

    if (!status || typeof status !== 'object') {
      errors.push(`${prefix}オブジェクトが無効です`);
      return errors;
    }

    // watchedNameIdのバリデーション
    if (!status.watchedNameId || typeof status.watchedNameId !== 'string') {
      errors.push(`${prefix}監視対象名前IDが無効です`);
    }

    // matchedNameのバリデーション
    if (typeof status.matchedName !== 'string') {
      errors.push(`${prefix}マッチした名前が文字列ではありません`);
    }

    // hasRightのバリデーション
    if (typeof status.hasRight !== 'boolean') {
      errors.push(`${prefix}回答権フラグがboolean値ではありません`);
    }

    // lastUpdatedのバリデーション
    if (typeof status.lastUpdated !== 'number' || status.lastUpdated < 0) {
      errors.push(`${prefix}最終更新時刻が無効です`);
    }

    // foundのバリデーション
    if (typeof status.found !== 'boolean') {
      errors.push(`${prefix}発見フラグがboolean値ではありません`);
    }

    return errors;
  }

  /**
   * エラー状態の管理
   */
  private errorState: {
    hasError: boolean;
    lastError?: string;
    errorCount: number;
    lastErrorTime?: number;
  } = {
    hasError: false,
    errorCount: 0
  };

  /**
   * エラー状態の記録
   */
  public recordError(error: string, details?: any): void {
    this.errorState = {
      hasError: true,
      lastError: error,
      errorCount: this.errorState.errorCount + 1,
      lastErrorTime: Date.now()
    };

    console.error('Error recorded:', {
      error,
      details,
      errorCount: this.errorState.errorCount
    });

    // エラーが頻発している場合は監視を一時停止
    if (this.errorState.errorCount >= 5) {
      console.warn('Too many errors detected, temporarily stopping monitoring');
      this.handleCriticalError();
    }
  }

  /**
   * エラー状態のクリア
   */
  public clearErrorState(): void {
    this.errorState = {
      hasError: false,
      errorCount: 0
    };
    console.log('Error state cleared');
  }

  /**
   * エラー状態の取得
   */
  public getErrorState(): typeof this.errorState {
    return { ...this.errorState };
  }

  /**
   * 重大エラーの処理
   */
  private async handleCriticalError(): Promise<void> {
    try {
      // 監視を停止
      await this.updateMonitorState({ isActive: false });
      
      // Content Scriptに停止を通知
      await this.handleStopMonitoring({ type: 'STOP_MONITORING' });
      
      console.log('Monitoring stopped due to critical errors');
    } catch (error) {
      console.error('Failed to handle critical error:', error);
    }
  }

  /**
   * 状態の健全性チェック
   */
  public async performHealthCheck(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 設定の健全性チェック
      const settings = await this.getValidatedSettings();
      if (settings.watchedNames.length === 0) {
        issues.push('監視対象名前が設定されていません');
        recommendations.push('設定タブで監視したい名前を追加してください');
      }

      // 状態の健全性チェック
      const validation = this.validateMonitorState(this.currentState);
      if (!validation.isValid) {
        issues.push(...validation.errors);
        recommendations.push('アプリケーションを再起動してください');
      }

      // エラー状態のチェック
      if (this.errorState.hasError) {
        issues.push(`エラーが発生しています: ${this.errorState.lastError}`);
        if (this.errorState.errorCount > 1) {
          recommendations.push('ページを再読み込みしてください');
        }
      }

      // 最終スキャン時刻のチェック
      const timeSinceLastScan = Date.now() - this.currentState.lastScan;
      if (this.currentState.isActive && timeSinceLastScan > 30000) { // 30秒
        issues.push('長時間スキャンが実行されていません');
        recommendations.push('監視を再開してください');
      }

      const isHealthy = issues.length === 0;

      console.log('Health check completed:', {
        isHealthy,
        issueCount: issues.length,
        recommendationCount: recommendations.length
      });

      return {
        isHealthy,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        isHealthy: false,
        issues: ['健全性チェックの実行に失敗しました'],
        recommendations: ['アプリケーションを再起動してください']
      };
    }
  }

  /**
   * 状態のリセット
   */
  public async resetMonitorState(): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const defaultState: MonitorState = {
        statuses: [],
        isActive: false,
        lastScan: 0
      };

      const result = await this.updateMonitorState(defaultState);
      
      if (result.success) {
        this.clearErrorState();
        console.log('Monitor state reset successfully');
      }

      return result;
    } catch (error) {
      console.error('Failed to reset monitor state:', error);
      return {
        success: false,
        errors: ['監視状態のリセットに失敗しました']
      };
    }
  }
}