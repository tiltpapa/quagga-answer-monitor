import { writable, derived } from 'svelte/store';
import type { Settings, WatchedName } from '../../../types/index';

interface OptionsState {
  settings: Settings | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: OptionsState = {
  settings: null,
  isLoading: false,
  error: null
};

const optionsState = writable<OptionsState>(initialState);

// 派生ストア
export const settings = derived(optionsState, $state => $state.settings);
export const isLoading = derived(optionsState, $state => $state.isLoading);
export const error = derived(optionsState, $state => $state.error);

class OptionsStore {
  private updateState(updates: Partial<OptionsState>) {
    optionsState.update(state => ({ ...state, ...updates }));
  }

  private setLoading(loading: boolean) {
    this.updateState({ isLoading: loading });
  }

  private setError(error: string | null) {
    this.updateState({ error });
  }

  private setSettings(settings: Settings) {
    this.updateState({ settings });
  }

  async initialize(): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      
      if (response && !response.error) {
        this.setSettings(response);
      } else {
        throw new Error(response?.error || '設定の取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to initialize options store:', error);
      this.setError('設定の読み込みに失敗しました');
    } finally {
      this.setLoading(false);
    }
  }

  async updateSettings(newSettings: Settings): Promise<boolean> {
    this.setLoading(true);
    this.setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: newSettings
      });

      if (response && response.success) {
        this.setSettings(response.settings);
        return true;
      } else {
        const errorMessage = response?.errors?.join(', ') || '設定の更新に失敗しました';
        this.setError(errorMessage);
        return false;
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      this.setError('設定の更新中にエラーが発生しました');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async addWatchedName(name: string, exactMatch: boolean = false): Promise<boolean> {
    this.setError(null);

    try {
      const currentSettings = await this.getCurrentSettings();
      if (!currentSettings) {
        throw new Error('現在の設定を取得できません');
      }

      // 重複チェック
      const isDuplicate = currentSettings.watchedNames.some(
        wn => wn.name.toLowerCase() === name.toLowerCase()
      );

      if (isDuplicate) {
        this.setError('同じ名前が既に登録されています');
        return false;
      }

      const newWatchedName: WatchedName = {
        id: this.generateId(),
        name: name.trim(),
        exactMatch,
        enabled: true
      };

      const updatedSettings: Settings = {
        ...currentSettings,
        watchedNames: [...currentSettings.watchedNames, newWatchedName]
      };

      return await this.updateSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to add watched name:', error);
      this.setError('監視対象の追加に失敗しました');
      return false;
    }
  }

  async removeWatchedName(id: string): Promise<boolean> {
    this.setError(null);

    try {
      const currentSettings = await this.getCurrentSettings();
      if (!currentSettings) {
        throw new Error('現在の設定を取得できません');
      }

      const updatedWatchedNames = currentSettings.watchedNames.filter(wn => wn.id !== id);

      if (updatedWatchedNames.length === currentSettings.watchedNames.length) {
        this.setError('指定された監視対象が見つかりません');
        return false;
      }

      const updatedSettings: Settings = {
        ...currentSettings,
        watchedNames: updatedWatchedNames
      };

      return await this.updateSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to remove watched name:', error);
      this.setError('監視対象の削除に失敗しました');
      return false;
    }
  }

  async updateWatchedName(id: string, updates: Partial<WatchedName>): Promise<boolean> {
    this.setError(null);

    try {
      const currentSettings = await this.getCurrentSettings();
      if (!currentSettings) {
        throw new Error('現在の設定を取得できません');
      }

      const watchedNameIndex = currentSettings.watchedNames.findIndex(wn => wn.id === id);
      if (watchedNameIndex === -1) {
        this.setError('指定された監視対象が見つかりません');
        return false;
      }

      // 名前の重複チェック（名前が変更される場合）
      if (updates.name) {
        const isDuplicate = currentSettings.watchedNames.some(
          (wn, index) => 
            index !== watchedNameIndex && 
            wn.name.toLowerCase() === updates.name!.toLowerCase()
        );

        if (isDuplicate) {
          this.setError('同じ名前が既に登録されています');
          return false;
        }
      }

      const updatedWatchedNames = [...currentSettings.watchedNames];
      updatedWatchedNames[watchedNameIndex] = {
        ...updatedWatchedNames[watchedNameIndex],
        ...updates,
        name: updates.name?.trim() || updatedWatchedNames[watchedNameIndex].name
      };

      const updatedSettings: Settings = {
        ...currentSettings,
        watchedNames: updatedWatchedNames
      };

      return await this.updateSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update watched name:', error);
      this.setError('監視対象の更新に失敗しました');
      return false;
    }
  }

  async updateRefreshInterval(interval: number): Promise<boolean> {
    this.setError(null);

    try {
      const currentSettings = await this.getCurrentSettings();
      if (!currentSettings) {
        throw new Error('現在の設定を取得できません');
      }

      if (interval < 100) {
        this.setError('更新間隔は100ミリ秒以上である必要があります');
        return false;
      }

      const updatedSettings: Settings = {
        ...currentSettings,
        refreshInterval: Math.floor(interval)
      };

      return await this.updateSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update refresh interval:', error);
      this.setError('更新間隔の設定に失敗しました');
      return false;
    }
  }

  async resetToDefault(): Promise<boolean> {
    this.setError(null);

    try {
      // デフォルト設定を取得
      const { DEFAULT_SETTINGS } = await import('../../../types/index');
      return await this.updateSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Failed to reset to default:', error);
      this.setError('デフォルト設定への復元に失敗しました');
      return false;
    }
  }

  clearError(): void {
    this.setError(null);
  }

  private async getCurrentSettings(): Promise<Settings | null> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      return response && !response.error ? response : null;
    } catch (error) {
      console.error('Failed to get current settings:', error);
      return null;
    }
  }

  private generateId(): string {
    return `watched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const optionsStore = new OptionsStore();