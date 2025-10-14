/**
 * テスト環境のセットアップ
 */
import { vi } from 'vitest';

// Chrome Extension APIのモック
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// グローバルにchromeオブジェクトを設定
(global as any).chrome = mockChrome;

// WXTのdefineContentScriptのモック
(global as any).defineContentScript = vi.fn((config: any) => config);

// コンソールのモック（テスト出力をクリーンに保つため）
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// MutationObserverのモック
class MockMutationObserver {
  private callback: MutationCallback;
  
  constructor(callback: MutationCallback) {
    this.callback = callback;
  }
  
  observe() {
    // モック実装
  }
  
  disconnect() {
    // モック実装
  }
  
  takeRecords(): MutationRecord[] {
    return [];
  }
}

(global as any).MutationObserver = MockMutationObserver;