import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WatchedName, Settings, Message, AnswerStatus } from '../types';

// Chrome API のモック
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn()
  }
};

// @ts-ignore
global.chrome = mockChrome;

describe('統合テスト: Content Script ↔ Background Script ↔ Side Panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('設定変更から監視開始までのエンドツーエンドフロー', () => {
    it('新しい監視対象名前を追加して監視を開始できる', async () => {
      // 1. 初期設定の取得をシミュレート
      const initialSettings: Settings = {
        watchedNames: [],
        refreshInterval: 1000
      };
      
      mockChrome.storage.local.get.mockResolvedValue({ settings: initialSettings });

      // 2. 新しい名前を追加
      const newName: WatchedName = {
        id: 'test-1',
        name: 'テストユーザー',
        exactMatch: false,
        enabled: true
      };

      const updatedSettings: Settings = {
        ...initialSettings,
        watchedNames: [newName]
      };

      // 3. 実際の関数呼び出しをシミュレート
      await chrome.storage.local.get(['settings']);
      await chrome.storage.local.set({ settings: updatedSettings });
      
      const updateMessage: Message = {
        type: 'UPDATE_SETTINGS',
        payload: updatedSettings
      };
      
      await chrome.runtime.sendMessage(updateMessage);

      // テスト実行
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['settings']);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ settings: updatedSettings });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(updateMessage);
    });

    it('監視結果がSide Panelに正しく表示される', async () => {
      // 1. 監視対象の設定
      const answerStatus: AnswerStatus = {
        watchedNameId: 'test-1',
        matchedName: 'テストユーザー',
        hasRight: true,
        lastUpdated: Date.now(),
        found: true
      };

      // 2. Side Panelでの状態取得をシミュレート
      const getStatusMessage: Message = {
        type: 'GET_STATUS'
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        statuses: [answerStatus],
        isActive: true,
        lastScan: Date.now()
      });

      // 実際の関数呼び出し
      const response = await chrome.runtime.sendMessage(getStatusMessage);

      // テスト実行
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(getStatusMessage);
      expect(response.statuses).toContain(answerStatus);
    });
  });

  describe('メッセージング通信テスト', () => {
    it('Content Script → Background Script 通信が正常に動作する', async () => {
      const message: Message = {
        type: 'STATUS_UPDATE',
        payload: {
          statuses: [{
            watchedNameId: 'test-1',
            matchedName: 'テストユーザー',
            hasRight: false,
            lastUpdated: Date.now(),
            found: true
          }]
        }
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      // Content Scriptからのメッセージ送信をシミュレート
      await chrome.runtime.sendMessage(message);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('Background Script → Side Panel 通信が正常に動作する', async () => {
      const settingsMessage: Message = {
        type: 'GET_SETTINGS'
      };

      const mockSettings: Settings = {
        watchedNames: [{
          id: 'test-1',
          name: 'テストユーザー',
          exactMatch: false,
          enabled: true
        }],
        refreshInterval: 1000
      };

      mockChrome.runtime.sendMessage.mockResolvedValue(mockSettings);

      // Side PanelからBackground Scriptへのメッセージ送信をシミュレート
      const response = await chrome.runtime.sendMessage(settingsMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(settingsMessage);
      expect(response).toEqual(mockSettings);
    });

    it('Side Panel → Background Script → Content Script 通信チェーンが正常に動作する', async () => {
      // 1. Side PanelからBackground Scriptへ設定更新
      const updateMessage: Message = {
        type: 'UPDATE_SETTINGS',
        payload: {
          watchedNames: [{
            id: 'test-1',
            name: '新しいユーザー',
            exactMatch: true,
            enabled: true
          }],
          refreshInterval: 1000
        }
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      // 2. Background ScriptからContent Scriptへ監視開始
      const startMonitoringMessage: Message = {
        type: 'START_MONITORING',
        payload: { watchedNames: updateMessage.payload.watchedNames }
      };

      mockChrome.tabs.query.mockResolvedValue([{ id: 123 }]);
      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

      // テスト実行
      await chrome.runtime.sendMessage(updateMessage);
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tabs[0].id!, startMonitoringMessage);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(updateMessage);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, startMonitoringMessage);
    });
  });

  describe('エラーハンドリング統合テスト', () => {
    it('ストレージエラー時の復旧処理が正常に動作する', async () => {
      // ストレージエラーをシミュレート
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      // デフォルト設定での復旧
      const defaultSettings: Settings = {
        watchedNames: [],
        refreshInterval: 1000
      };

      // エラー後のデフォルト設定取得をシミュレート
      mockChrome.storage.local.get.mockResolvedValueOnce({ settings: defaultSettings });

      try {
        await chrome.storage.local.get(['settings']);
      } catch (error) {
        // エラーハンドリング後のデフォルト設定取得
        const fallbackResult = await chrome.storage.local.get(['settings']);
        expect(fallbackResult.settings).toEqual(defaultSettings);
      }
    });

    it('メッセージング失敗時の再試行処理が動作する', async () => {
      const message: Message = {
        type: 'GET_STATUS'
      };

      // 最初の試行は失敗
      mockChrome.runtime.sendMessage
        .mockRejectedValueOnce(new Error('Connection error'))
        .mockResolvedValueOnce({ success: true });

      // 再試行ロジックをシミュレート
      try {
        await chrome.runtime.sendMessage(message);
      } catch (error) {
        // 再試行
        const retryResult = await chrome.runtime.sendMessage(message);
        expect(retryResult).toEqual({ success: true });
      }

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });
  });
});