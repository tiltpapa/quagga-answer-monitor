/// <reference path="../types/chrome.d.ts" />

import type { Settings, MonitorState } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../types';

/**
 * Chrome Storage APIのラッパークラス
 * 設定とモニター状態の永続化を管理
 */
export class StorageManager {
  private static instance: StorageManager;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * 設定を取得
   * 設定が存在しない場合はデフォルト設定を返す
   */
  public async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
      
      if (result[STORAGE_KEYS.SETTINGS]) {
        // 既存の設定をデフォルト設定とマージして不足項目を補完
        return {
          ...DEFAULT_SETTINGS,
          ...result[STORAGE_KEYS.SETTINGS],
        };
      }
      
      // 設定が存在しない場合はデフォルト設定を保存して返す
      await this.saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('設定の取得に失敗しました:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 設定を保存
   */
  public async saveSettings(settings: Settings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: settings,
      });
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      throw new Error('設定の保存に失敗しました');
    }
  }

  /**
   * 設定を更新（部分更新）
   */
  public async updateSettings(partialSettings: Partial<Settings>): Promise<Settings> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...partialSettings,
      };
      
      await this.saveSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('設定の更新に失敗しました:', error);
      throw new Error('設定の更新に失敗しました');
    }
  }

  /**
   * モニター状態を取得
   */
  public async getMonitorState(): Promise<MonitorState | null> {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.MONITOR_STATE]);
      return result[STORAGE_KEYS.MONITOR_STATE] || null;
    } catch (error) {
      console.error('モニター状態の取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * モニター状態を保存
   */
  public async saveMonitorState(state: MonitorState): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.MONITOR_STATE]: state,
      });
    } catch (error) {
      console.error('モニター状態の保存に失敗しました:', error);
      throw new Error('モニター状態の保存に失敗しました');
    }
  }

  /**
   * モニター状態を更新（部分更新）
   */
  public async updateMonitorState(partialState: Partial<MonitorState>): Promise<MonitorState> {
    try {
      const currentState = await this.getMonitorState();
      const defaultState: MonitorState = {
        statuses: [],
        isActive: false,
        lastScan: 0,
      };
      
      const updatedState = {
        ...(currentState || defaultState),
        ...partialState,
      };
      
      await this.saveMonitorState(updatedState);
      return updatedState;
    } catch (error) {
      console.error('モニター状態の更新に失敗しました:', error);
      throw new Error('モニター状態の更新に失敗しました');
    }
  }

  /**
   * 全データをクリア（デバッグ用）
   */
  public async clearAll(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('データのクリアに失敗しました:', error);
      throw new Error('データのクリアに失敗しました');
    }
  }

  /**
   * ストレージの使用量を取得（デバッグ用）
   */
  public async getStorageUsage(): Promise<number> {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      return usage;
    } catch (error) {
      console.error('ストレージ使用量の取得に失敗しました:', error);
      return 0;
    }
  }

  /**
   * 設定変更を監視するリスナーを追加
   */
  public addStorageListener(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }
}

// デフォルトエクスポート
export default StorageManager;