import type { Settings, WatchedName } from '../types';
import { DEFAULT_SETTINGS } from '../types';

/**
 * 設定データのバリデーションとサニタイゼーション
 */
export class SettingsValidator {
  /**
   * 設定データが有効かどうかを検証
   */
  public static isValidSettings(settings: any): settings is Settings {
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    // watchedNamesの検証
    if (!Array.isArray(settings.watchedNames)) {
      return false;
    }

    for (const name of settings.watchedNames) {
      if (!this.isValidWatchedName(name)) {
        return false;
      }
    }

    // refreshIntervalの検証
    if (typeof settings.refreshInterval !== 'number' || 
        settings.refreshInterval < 100 || 
        settings.refreshInterval > 60000) {
      return false;
    }

    return true;
  }

  /**
   * WatchedNameオブジェクトが有効かどうかを検証
   */
  public static isValidWatchedName(name: any): name is WatchedName {
    if (!name || typeof name !== 'object') {
      return false;
    }

    return (
      typeof name.id === 'string' && name.id.length > 0 &&
      typeof name.name === 'string' && name.name.trim().length > 0 &&
      typeof name.exactMatch === 'boolean' &&
      typeof name.enabled === 'boolean'
    );
  }

  /**
   * 設定データをサニタイズして安全な形式に変換
   */
  public static sanitizeSettings(settings: any): Settings {
    if (!this.isValidSettings(settings)) {
      return DEFAULT_SETTINGS;
    }

    return {
      watchedNames: settings.watchedNames.map((name: WatchedName) => ({
        id: name.id.trim(),
        name: name.name.trim(),
        exactMatch: Boolean(name.exactMatch),
        enabled: Boolean(name.enabled),
      })),
      refreshInterval: Math.max(100, Math.min(60000, Number(settings.refreshInterval))),
    };
  }

  /**
   * 新しいWatchedNameオブジェクトを作成
   */
  public static createWatchedName(name: string, exactMatch: boolean = false): WatchedName {
    return {
      id: this.generateId(),
      name: name.trim(),
      exactMatch,
      enabled: true,
    };
  }

  /**
   * 一意のIDを生成
   */
  public static generateId(): string {
    return `watched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 重複する名前をチェック
   */
  public static hasDuplicateName(watchedNames: WatchedName[], newName: string, excludeId?: string): boolean {
    const trimmedName = newName.trim().toLowerCase();
    return watchedNames.some(item => 
      item.id !== excludeId && 
      item.name.toLowerCase() === trimmedName
    );
  }

  /**
   * 設定をデフォルト値でマージ
   */
  public static mergeWithDefaults(settings: Partial<Settings>): Settings {
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      watchedNames: settings.watchedNames || DEFAULT_SETTINGS.watchedNames,
    };
  }
}