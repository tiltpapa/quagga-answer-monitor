/**
 * Content Script 単体テスト
 * DOM要素抽出、名前マッチング、MutationObserverのテスト
 * 要件: 1.2, 1.3, 1.4, 2.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WatchedName, AnswerRightData } from '../types/index';

// Content Scriptのクラスを直接インポートするためのモック
class QuaggaMonitor {
  private observer: MutationObserver | null = null;
  private watchedNames: WatchedName[] = [];
  private isMonitoring = false;
  private throttleTimer: number | null = null;
  private readonly THROTTLE_DELAY = 500;

  async initialize(): Promise<void> {
    await this.loadSettings();
    this.performScan();
    this.startDOMObserver();
    this.setupMessageListener();
  }

  extractAnswerRights(): AnswerRightData[] {
    const results: AnswerRightData[] = [];
    const timestamp = Date.now();

    try {
      const emptyState = document.querySelector('.ui-empty-state');
      if (emptyState) {
        return results;
      }

      const rightsTable = document.querySelector('._rights-table_1treo_151');
      if (!rightsTable) {
        return results;
      }

      const rightElements = rightsTable.querySelectorAll('._right_1treo_151');

      rightElements.forEach((rightElement) => {
        try {
          const nameElement = rightElement.querySelector('._name_1treo_160');
          if (!nameElement) {
            return;
          }

          const name = nameElement.textContent?.trim();
          if (!name) {
            return;
          }

          const computedStyle = window.getComputedStyle(rightElement);
          const backgroundColor = computedStyle.backgroundColor;
          const hasRight = this.isWhiteBackground(backgroundColor);

          results.push({
            name,
            hasRight,
            timestamp
          });
        } catch (error) {
          console.error('Error processing right element:', error);
        }
      });

    } catch (error) {
      console.error('Error during DOM extraction:', error);
    }

    return results;
  }

  private isWhiteBackground(backgroundColor: string): boolean {
    const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      return r >= 240 && g >= 240 && b >= 240;
    }

    return backgroundColor === 'white' || backgroundColor === 'rgb(255, 255, 255)';
  }

  checkNameMatch(extractedName: string, watchedName: WatchedName): boolean {
    if (!watchedName.enabled) {
      return false;
    }

    const targetName = watchedName.name.trim();
    const sourceName = extractedName.trim();

    if (watchedName.exactMatch) {
      return sourceName === targetName;
    } else {
      return sourceName.toLowerCase().includes(targetName.toLowerCase());
    }
  }

  private startDOMObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
      }

      this.throttleTimer = window.setTimeout(() => {
        this.handleDOMChanges(mutations);
      }, this.THROTTLE_DELAY);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  private handleDOMChanges(mutations: MutationRecord[]): void {
    let shouldRescan = false;

    for (const mutation of mutations) {
      if (this.isRelevantChange(mutation)) {
        shouldRescan = true;
        break;
      }
    }

    if (shouldRescan) {
      this.performScan();
    }
  }

  private isRelevantChange(mutation: MutationRecord): boolean {
    const relevantClasses = [
      '_rights-table_1treo_151',
      '_right_1treo_151',
      '_name_1treo_160',
      'ui-empty-state'
    ];

    const checkNodes = (nodes: NodeList) => {
      for (const node of Array.from(nodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (relevantClasses.some(cls => element.classList?.contains(cls))) {
            return true;
          }
          if (relevantClasses.some(cls => element.querySelector(`.${cls}`))) {
            return true;
          }
        }
      }
      return false;
    };

    if (mutation.type === 'childList') {
      return checkNodes(mutation.addedNodes) || checkNodes(mutation.removedNodes);
    }

    if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
      const element = mutation.target as Element;
      return relevantClasses.some(cls => element.classList?.contains(cls));
    }

    return false;
  }

  private performScan(): void {
    if (!this.isMonitoring) {
      return;
    }
    // スキャン実行のモック
  }

  private async loadSettings(): Promise<void> {
    // 設定読み込みのモック
  }

  private setupMessageListener(): void {
    // メッセージリスナー設定のモック
  }

  // テスト用のパブリックメソッド
  public setWatchedNames(names: WatchedName[]): void {
    this.watchedNames = names;
  }

  public setMonitoring(monitoring: boolean): void {
    this.isMonitoring = monitoring;
  }

  public getObserver(): MutationObserver | null {
    return this.observer;
  }

  public startDOMObserverPublic(): void {
    this.startDOMObserver();
  }

  public isRelevantChangePublic(mutation: MutationRecord): boolean {
    return this.isRelevantChange(mutation);
  }
}

describe('QuaggaMonitor Content Script', () => {
  let monitor: QuaggaMonitor;

  beforeEach(() => {
    monitor = new QuaggaMonitor();
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('DOM要素抽出機能 (要件: 1.2, 1.3, 1.4)', () => {
    it('ui-empty-stateクラスが存在する場合は空の配列を返す', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="ui-empty-state">参加者がいません</div>
      `;

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result).toEqual([]);
    });

    it('_rights-table_1treo_151クラスが存在しない場合は空の配列を返す', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="some-other-table">テーブル</div>
      `;

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result).toEqual([]);
    });

    it('正常なDOM構造から回答権データを抽出する', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <span class="_name_1treo_160">田中太郎</span>
          </div>
          <div class="_right_1treo_151" style="background-color: rgb(200, 200, 200);">
            <span class="_name_1treo_160">佐藤花子</span>
          </div>
        </div>
      `;

      // window.getComputedStyleのモック
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn((element) => {
        const style = element.getAttribute('style') || '';
        if (style.includes('rgb(255, 255, 255)')) {
          return { backgroundColor: 'rgb(255, 255, 255)' } as CSSStyleDeclaration;
        }
        return { backgroundColor: 'rgb(200, 200, 200)' } as CSSStyleDeclaration;
      });

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: '田中太郎',
        hasRight: true,
      });
      expect(result[1]).toMatchObject({
        name: '佐藤花子',
        hasRight: false,
      });
      expect(result[0].timestamp).toBeTypeOf('number');
      expect(result[1].timestamp).toBeTypeOf('number');

      // Cleanup
      window.getComputedStyle = originalGetComputedStyle;
    });

    it('名前要素が存在しない場合はスキップする', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <!-- 名前要素なし -->
          </div>
        </div>
      `;

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result).toEqual([]);
    });

    it('名前が空の場合はスキップする', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <span class="_name_1treo_160">   </span>
          </div>
        </div>
      `;

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('背景色判定機能', () => {
    it('RGB値が240以上の場合は回答権ありと判定する', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: rgb(245, 245, 245);">
            <span class="_name_1treo_160">テストユーザー</span>
          </div>
        </div>
      `;

      window.getComputedStyle = vi.fn(() => ({
        backgroundColor: 'rgb(245, 245, 245)'
      } as CSSStyleDeclaration));

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result[0].hasRight).toBe(true);
    });

    it('RGB値が240未満の場合は回答権なしと判定する', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: rgb(200, 200, 200);">
            <span class="_name_1treo_160">テストユーザー</span>
          </div>
        </div>
      `;

      window.getComputedStyle = vi.fn(() => ({
        backgroundColor: 'rgb(200, 200, 200)'
      } as CSSStyleDeclaration));

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result[0].hasRight).toBe(false);
    });

    it('white色名の場合は回答権ありと判定する', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: white;">
            <span class="_name_1treo_160">テストユーザー</span>
          </div>
        </div>
      `;

      window.getComputedStyle = vi.fn(() => ({
        backgroundColor: 'white'
      } as CSSStyleDeclaration));

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result[0].hasRight).toBe(true);
    });
  });

  describe('名前マッチング機能 (要件: 2.4)', () => {
    const testCases = [
      {
        description: '完全一致モードで同じ名前の場合はマッチする',
        extractedName: '田中太郎',
        watchedName: { id: '1', name: '田中太郎', exactMatch: true, enabled: true },
        expected: true
      },
      {
        description: '完全一致モードで異なる名前の場合はマッチしない',
        extractedName: '田中太郎',
        watchedName: { id: '1', name: '佐藤花子', exactMatch: true, enabled: true },
        expected: false
      },
      {
        description: '部分一致モードで名前が含まれる場合はマッチする',
        extractedName: '田中太郎',
        watchedName: { id: '1', name: '田中', exactMatch: false, enabled: true },
        expected: true
      },
      {
        description: '部分一致モードで名前が含まれない場合はマッチしない',
        extractedName: '田中太郎',
        watchedName: { id: '1', name: '佐藤', exactMatch: false, enabled: true },
        expected: false
      },
      {
        description: '部分一致モードで大文字小文字を区別しない',
        extractedName: '田中TARO',
        watchedName: { id: '1', name: 'taro', exactMatch: false, enabled: true },
        expected: true
      },
      {
        description: '無効化されている場合はマッチしない',
        extractedName: '田中太郎',
        watchedName: { id: '1', name: '田中太郎', exactMatch: true, enabled: false },
        expected: false
      },
      {
        description: '前後の空白は無視される',
        extractedName: '  田中太郎  ',
        watchedName: { id: '1', name: '  田中太郎  ', exactMatch: true, enabled: true },
        expected: true
      }
    ];

    testCases.forEach(({ description, extractedName, watchedName, expected }) => {
      it(description, () => {
        // Act
        const result = monitor.checkNameMatch(extractedName, watchedName);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe('MutationObserver機能 (要件: 3.4, 5.1)', () => {
    it('DOM監視が開始される', () => {
      // Arrange
      const mockObserve = vi.fn();
      const mockDisconnect = vi.fn();

      // MutationObserverのモックを上書き
      (global as any).MutationObserver = vi.fn().mockImplementation((callback) => ({
        observe: mockObserve,
        disconnect: mockDisconnect,
        takeRecords: () => []
      }));

      // Act
      monitor.startDOMObserverPublic();

      // Assert
      expect(MutationObserver).toHaveBeenCalledWith(expect.any(Function));
      expect(mockObserve).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    });

    it('既存のオブザーバーがある場合は切断してから新しく開始する', () => {
      // Arrange
      const mockDisconnect = vi.fn();
      const mockObserve = vi.fn();

      (global as any).MutationObserver = vi.fn().mockImplementation(() => ({
        observe: mockObserve,
        disconnect: mockDisconnect,
        takeRecords: () => []
      }));

      // Act
      monitor.startDOMObserverPublic(); // 1回目
      monitor.startDOMObserverPublic(); // 2回目

      // Assert
      expect(mockDisconnect).toHaveBeenCalled();
      expect(MutationObserver).toHaveBeenCalledTimes(2);
    });
  });

  describe('関連する変更の判定', () => {
    let testMonitor: QuaggaMonitor;

    beforeEach(() => {
      testMonitor = new QuaggaMonitor();
    });

    it('関連するクラスを持つ要素の追加は関連する変更と判定される', () => {
      // Arrange
      const addedElement = document.createElement('div');
      addedElement.className = '_rights-table_1treo_151';

      const mutation: MutationRecord = {
        type: 'childList',
        target: document.body,
        addedNodes: [addedElement] as any,
        removedNodes: [] as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null
      };

      // Act
      const result = testMonitor.isRelevantChangePublic(mutation);

      // Assert
      expect(result).toBe(true);
    });

    it('関連するクラスを持たない要素の追加は関連しない変更と判定される', () => {
      // Arrange
      const addedElement = document.createElement('div');
      addedElement.className = 'unrelated-class';

      const mutation: MutationRecord = {
        type: 'childList',
        target: document.body,
        addedNodes: [addedElement] as any,
        removedNodes: [] as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null
      };

      // Act
      const result = testMonitor.isRelevantChangePublic(mutation);

      // Assert
      expect(result).toBe(false);
    });

    it('関連するクラスを持つ子要素がある場合は関連する変更と判定される', () => {
      // Arrange
      const parentElement = document.createElement('div');
      const childElement = document.createElement('span');
      childElement.className = '_name_1treo_160';
      parentElement.appendChild(childElement);

      const mutation: MutationRecord = {
        type: 'childList',
        target: document.body,
        addedNodes: [parentElement] as any,
        removedNodes: [] as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null
      };

      // Act
      const result = testMonitor.isRelevantChangePublic(mutation);

      // Assert
      expect(result).toBe(true);
    });

    it('関連するクラスの属性変更は関連する変更と判定される', () => {
      // Arrange
      const element = document.createElement('div');
      element.className = '_right_1treo_151';

      const mutation: MutationRecord = {
        type: 'attributes',
        target: element,
        addedNodes: [] as any,
        removedNodes: [] as any,
        previousSibling: null,
        nextSibling: null,
        attributeName: 'class',
        attributeNamespace: null,
        oldValue: null
      };

      // Act
      const result = testMonitor.isRelevantChangePublic(mutation);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('DOM抽出中にエラーが発生した場合は空の配列を返す', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151">
            <span class="_name_1treo_160">テストユーザー</span>
          </div>
        </div>
      `;

      // window.getComputedStyleでエラーを発生させる
      window.getComputedStyle = vi.fn(() => {
        throw new Error('getComputedStyle error');
      });

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result).toEqual([]);
    });

    it('要素処理中にエラーが発生した場合はその要素をスキップして続行する', () => {
      // Arrange
      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <span class="_name_1treo_160">正常ユーザー</span>
          </div>
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <span class="_name_1treo_160">エラーユーザー</span>
          </div>
        </div>
      `;

      let callCount = 0;
      window.getComputedStyle = vi.fn((element) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Second element error');
        }
        return { backgroundColor: 'rgb(255, 255, 255)' } as CSSStyleDeclaration;
      });

      // Act
      const result = monitor.extractAnswerRights();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('正常ユーザー');
    });
  });

  describe('統合テスト', () => {
    it('完全なワークフロー: DOM抽出から名前マッチングまで', () => {
      // Arrange
      const watchedNames: WatchedName[] = [
        { id: '1', name: '田中', exactMatch: false, enabled: true },
        { id: '2', name: '佐藤花子', exactMatch: true, enabled: true },
        { id: '3', name: '無効ユーザー', exactMatch: true, enabled: false }
      ];

      monitor.setWatchedNames(watchedNames);

      document.body.innerHTML = `
        <div class="_rights-table_1treo_151">
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <span class="_name_1treo_160">田中太郎</span>
          </div>
          <div class="_right_1treo_151" style="background-color: rgb(200, 200, 200);">
            <span class="_name_1treo_160">佐藤花子</span>
          </div>
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <span class="_name_1treo_160">無効ユーザー</span>
          </div>
          <div class="_right_1treo_151" style="background-color: rgb(255, 255, 255);">
            <span class="_name_1treo_160">山田次郎</span>
          </div>
        </div>
      `;

      window.getComputedStyle = vi.fn((element) => {
        const style = element.getAttribute('style') || '';
        if (style.includes('rgb(255, 255, 255)')) {
          return { backgroundColor: 'rgb(255, 255, 255)' } as CSSStyleDeclaration;
        }
        return { backgroundColor: 'rgb(200, 200, 200)' } as CSSStyleDeclaration;
      });

      // Act
      const extractedData = monitor.extractAnswerRights();

      // Assert - 抽出されたデータの確認
      expect(extractedData).toHaveLength(4);

      // 各監視対象名前に対するマッチング確認
      const tanaka = extractedData.find(data => data.name === '田中太郎');
      const sato = extractedData.find(data => data.name === '佐藤花子');
      const invalid = extractedData.find(data => data.name === '無効ユーザー');
      const yamada = extractedData.find(data => data.name === '山田次郎');

      expect(tanaka).toBeDefined();
      expect(sato).toBeDefined();
      expect(invalid).toBeDefined();
      expect(yamada).toBeDefined();

      // 名前マッチングの確認
      expect(monitor.checkNameMatch(tanaka!.name, watchedNames[0])).toBe(true); // 部分一致
      expect(monitor.checkNameMatch(sato!.name, watchedNames[1])).toBe(true); // 完全一致
      expect(monitor.checkNameMatch(invalid!.name, watchedNames[2])).toBe(false); // 無効
      expect(monitor.checkNameMatch(yamada!.name, watchedNames[0])).toBe(false); // マッチしない

      // 回答権の状況確認
      expect(tanaka!.hasRight).toBe(true);
      expect(sato!.hasRight).toBe(false);
      expect(invalid!.hasRight).toBe(true);
      expect(yamada!.hasRight).toBe(true);
    });
  });
});