/// <reference path="../types/chrome.d.ts" />

import type { Settings, MonitorState } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../types';

/**
 * 最も信頼性の高いストレージ実装
 * Chrome拡張機能のService Worker問題に対応
 */
export class ReliableStorage {
  private static instance: ReliableStorage;
  private static readonly MAX_RETRIES = 5;
  private static readonly RETRY_DELAY = 200;

  private constructor() {}

  public static getInstance(): ReliableStorage {
    if (!ReliableStorage.instance) {
      ReliableStorage.instance = new ReliableStorage();
    }
    return ReliableStorage.instance;
  }

  /**
   * 設定を保存（最も確実な方法）
   */
  public async saveSettings(settings: Settings): Promise<boolean> {
    console.log('ReliableStorage: Saving settings:', JSON.stringify(settings, null, 2));
    
    // 複数の方法で保存を試行
    const methods = [
      () => this.saveWithCallback(STORAGE_KEYS.SETTINGS, settings),
      () => this.saveWithPromise(STORAGE_KEYS.SETTINGS, settings),
      () => this.saveWithRetry(STORAGE_KEYS.SETTINGS, settings)
    ];

    for (const method of methods) {
      try {
        const success = await method();
        if (success) {
          console.log('ReliableStorage: Settings saved successfully');
          
          // 保存後に即座に確認
          const verification = await this.getSettings();
          console.log('ReliableStorage: Verification:', verification);
          
          // 設定が正しく保存されているか確認
          if (verification.watchedNames.length === settings.watchedNames.length) {
            return true;
          }
        }
      } catch (error) {
        console.error('ReliableStorage: Save method failed:', error);
      }
    }

    console.error('ReliableStorage: All save methods failed');
    return false;
  }

  /**
   * 設定を取得（最も確実な方法）
   */
  public async getSettings(): Promise<Settings> {
    console.log('ReliableStorage: Getting settings');

    // 複数の方法で取得を試行
    const methods = [
      () => this.getWithCallback(STORAGE_KEYS.SETTINGS),
      () => this.getWithPromise(STORAGE_KEYS.SETTINGS),
      () => this.getWithRetry(STORAGE_KEYS.SETTINGS)
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result) {
          const settings = {
            ...DEFAULT_SETTINGS,
            ...result
          };
          console.log('ReliableStorage: Retrieved settings:', settings);
          return settings;
        }
      } catch (error) {
        console.error('ReliableStorage: Get method failed:', error);
      }
    }

    console.log('ReliableStorage: All get methods failed, returning defaults');
    return DEFAULT_SETTINGS;
  }

  /**
   * Callback方式での保存
   */
  private saveWithCallback(key: string, data: any): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const payload = { [key]: data };
        chrome.storage.local.set(payload, () => {
          if (chrome.runtime.lastError) {
            console.error('ReliableStorage: Callback save error:', chrome.runtime.lastError);
            resolve(false);
          } else {
            console.log('ReliableStorage: Callback save success');
            resolve(true);
          }
        });
      } catch (error) {
        console.error('ReliableStorage: Callback save exception:', error);
        resolve(false);
      }
    });
  }

  /**
   * Promise方式での保存
   */
  private async saveWithPromise(key: string, data: any): Promise<boolean> {
    try {
      const payload = { [key]: data };
      await chrome.storage.local.set(payload);
      console.log('ReliableStorage: Promise save success');
      return true;
    } catch (error) {
      console.error('ReliableStorage: Promise save error:', error);
      return false;
    }
  }

  /**
   * リトライ付き保存
   */
  private async saveWithRetry(key: string, data: any): Promise<boolean> {
    for (let attempt = 1; attempt <= ReliableStorage.MAX_RETRIES; attempt++) {
      try {
        const payload = { [key]: data };
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.set(payload, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        console.log(`ReliableStorage: Retry save success on attempt ${attempt}`);
        return true;
      } catch (error) {
        console.error(`ReliableStorage: Retry save failed on attempt ${attempt}:`, error);
        
        if (attempt < ReliableStorage.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, ReliableStorage.RETRY_DELAY * attempt));
        }
      }
    }

    return false;
  }

  /**
   * Callback方式での取得
   */
  private getWithCallback(key: string): Promise<any> {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.error('ReliableStorage: Callback get error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            console.log('ReliableStorage: Callback get result:', result);
            resolve(result[key] || null);
          }
        });
      } catch (error) {
        console.error('ReliableStorage: Callback get exception:', error);
        resolve(null);
      }
    });
  }

  /**
   * Promise方式での取得
   */
  private async getWithPromise(key: string): Promise<any> {
    try {
      const result = await chrome.storage.local.get([key]);
      console.log('ReliableStorage: Promise get result:', result);
      return result[key] || null;
    } catch (error) {
      console.error('ReliableStorage: Promise get error:', error);
      return null;
    }
  }

  /**
   * リトライ付き取得
   */
  private async getWithRetry(key: string): Promise<any> {
    for (let attempt = 1; attempt <= ReliableStorage.MAX_RETRIES; attempt++) {
      try {
        const result = await new Promise<any>((resolve, reject) => {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });

        console.log(`ReliableStorage: Retry get success on attempt ${attempt}:`, result);
        return result[key] || null;
      } catch (error) {
        console.error(`ReliableStorage: Retry get failed on attempt ${attempt}:`, error);
        
        if (attempt < ReliableStorage.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, ReliableStorage.RETRY_DELAY * attempt));
        }
      }
    }

    return null;
  }

  /**
   * 監視状態を保存
   */
  public async saveMonitorState(state: MonitorState): Promise<boolean> {
    return await this.saveWithCallback(STORAGE_KEYS.MONITOR_STATE, state);
  }

  /**
   * 監視状態を取得
   */
  public async getMonitorState(): Promise<MonitorState | null> {
    return await this.getWithCallback(STORAGE_KEYS.MONITOR_STATE);
  }

  /**
   * 全データを取得
   */
  public async getAllData(): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          console.error('ReliableStorage: Get all data error:', chrome.runtime.lastError);
          resolve({});
        } else {
          console.log('ReliableStorage: All data:', result);
          resolve(result);
        }
      });
    });
  }

  /**
   * ストレージをクリア
   */
  public async clearAll(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('ReliableStorage: Clear error:', chrome.runtime.lastError);
          resolve(false);
        } else {
          console.log('ReliableStorage: All data cleared');
          resolve(true);
        }
      });
    });
  }

  /**
   * ストレージの変更を監視
   */
  public addStorageListener(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        console.log('ReliableStorage: Storage changed:', changes);
        callback(changes);
      }
    });
  }

  /**
   * ストレージの健全性をテスト
   */
  public async testStorage(): Promise<boolean> {
    const testKey = 'test_' + Date.now();
    const testData = { test: true, timestamp: Date.now() };

    try {
      // 保存テスト
      const saveSuccess = await this.saveWithCallback(testKey, testData);
      if (!saveSuccess) {
        console.error('ReliableStorage: Test save failed');
        return false;
      }

      // 取得テスト
      const retrievedData = await this.getWithCallback(testKey);
      if (!retrievedData || retrievedData.test !== true) {
        console.error('ReliableStorage: Test retrieve failed');
        return false;
      }

      // 削除テスト
      await new Promise<void>((resolve) => {
        chrome.storage.local.remove([testKey], () => {
          resolve();
        });
      });

      console.log('ReliableStorage: Storage test passed');
      return true;
    } catch (error) {
      console.error('ReliableStorage: Storage test failed:', error);
      return false;
    }
  }
}