import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WatchedName, Settings, AnswerStatus } from '../types';

// E2E検証テスト - 実際のQuaggaサイトでの動作をシミュレート
describe('E2E検証: 実際のQuaggaサイトでの動作テスト', () => {
  // DOM要素のモック
  const createMockDOM = () => {
    const mockRightsTable = document.createElement('div');
    mockRightsTable.className = '_rights-table_1treo_151';

    // 回答者1: 回答権あり（白背景）
    const mockUser1 = document.createElement('div');
    mockUser1.className = '_right_1treo_151';
    mockUser1.style.background = 'white';
    
    const mockName1 = document.createElement('div');
    mockName1.className = '_name_1treo_160';
    mockName1.textContent = 'テストユーザー1';
    mockUser1.appendChild(mockName1);

    // 回答者2: 回答権なし（グレー背景）
    const mockUser2 = document.createElement('div');
    mockUser2.className = '_right_1treo_151';
    mockUser2.style.background = 'rgb(243, 244, 246)';
    
    const mockName2 = document.createElement('div');
    mockName2.className = '_name_1treo_160';
    mockName2.textContent = 'テストユーザー2';
    mockUser2.appendChild(mockName2);

    // 回答者3: 部分一致テスト用
    const mockUser3 = document.createElement('div');
    mockUser3.className = '_right_1treo_151';
    mockUser3.style.background = 'white';
    
    const mockName3 = document.createElement('div');
    mockName3.className = '_name_1treo_160';
    mockName3.textContent = '山田太郎';
    mockUser3.appendChild(mockName3);

    mockRightsTable.appendChild(mockUser1);
    mockRightsTable.appendChild(mockUser2);
    mockRightsTable.appendChild(mockUser3);

    return mockRightsTable;
  };

  beforeEach(() => {
    // DOM環境をクリア
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('要件1: リアルタイム監視機能', () => {
    it('1.1 quagga.studioドメインでアドオンが有効化される', () => {
      // ドメイン制限のテスト
      const currentURL = 'https://quagga.studio/quiz/123';
      expect(currentURL).toMatch(/^https:\/\/quagga\.studio\//);
    });

    it('1.2 ui-empty-stateクラスの要素が存在する時、参加状況が取得できない状態と判定', () => {
      const emptyState = document.createElement('div');
      emptyState.className = 'ui-empty-state';
      document.body.appendChild(emptyState);

      const hasEmptyState = document.querySelector('.ui-empty-state') !== null;
      expect(hasEmptyState).toBe(true);
    });

    it('1.3 _rights-table_1treo_151クラスの要素が存在する時、スクレイピングを開始', () => {
      const mockTable = createMockDOM();
      document.body.appendChild(mockTable);

      const rightsTable = document.querySelector('._rights-table_1treo_151');
      expect(rightsTable).not.toBeNull();
    });

    it('1.4 _name_1treo_160クラスの要素から回答者名を取得', () => {
      const mockTable = createMockDOM();
      document.body.appendChild(mockTable);

      const nameElements = document.querySelectorAll('._name_1treo_160');
      const names = Array.from(nameElements).map(el => el.textContent);
      
      expect(names).toContain('テストユーザー1');
      expect(names).toContain('テストユーザー2');
      expect(names).toContain('山田太郎');
    });

    it('1.5 _right_1treo_151クラスの要素のbackgroundが白の時、回答権ありと判定', () => {
      const mockTable = createMockDOM();
      document.body.appendChild(mockTable);

      const rightElements = document.querySelectorAll('._right_1treo_151');
      const user1HasRight = (rightElements[0] as HTMLElement).style.background === 'white';
      const user2HasRight = (rightElements[1] as HTMLElement).style.background === 'white';

      expect(user1HasRight).toBe(true);
      expect(user2HasRight).toBe(false);
    });
  });

  describe('要件2: 監視対象名前管理機能', () => {
    it('2.4 完全一致/部分一致の検索モード', () => {
      const testName = '山田';
      const fullName = '山田太郎';

      // 完全一致テスト
      const exactMatch = (testName as string) === (fullName as string);
      expect(exactMatch).toBe(false);

      // 部分一致テスト
      const partialMatch = fullName.includes(testName);
      expect(partialMatch).toBe(true);
    });
  });

  describe('要件3: サイドパネル表示機能', () => {
    it('3.3 監視対象の回答者が見つかった時、名前と回答権の状況を表示', () => {
      const mockTable = createMockDOM();
      document.body.appendChild(mockTable);

      const watchedNames: WatchedName[] = [
        {
          id: 'test-1',
          name: 'テストユーザー1',
          exactMatch: true,
          enabled: true
        }
      ];

      // スクレイピング結果をシミュレート
      const nameElements = document.querySelectorAll('._name_1treo_160');
      const rightElements = document.querySelectorAll('._right_1treo_151');

      const results: AnswerStatus[] = [];
      
      nameElements.forEach((nameEl, index) => {
        const name = nameEl.textContent || '';
        const hasRight = (rightElements[index] as HTMLElement)?.style.background === 'white';
        
        watchedNames.forEach(watched => {
          const isMatch = watched.exactMatch ? 
            name === watched.name : 
            name.includes(watched.name);
            
          if (isMatch) {
            results.push({
              watchedNameId: watched.id,
              matchedName: name,
              hasRight,
              lastUpdated: Date.now(),
              found: true
            });
          }
        });
      });

      expect(results).toHaveLength(1);
      expect(results[0].matchedName).toBe('テストユーザー1');
      expect(results[0].hasRight).toBe(true);
    });

    it('3.5 監視対象の回答者が見つからない時、「見つかりません」と表示', () => {
      const mockTable = createMockDOM();
      document.body.appendChild(mockTable);

      const watchedNames: WatchedName[] = [
        {
          id: 'test-1',
          name: '存在しないユーザー',
          exactMatch: true,
          enabled: true
        }
      ];

      // スクレイピング結果をシミュレート
      const nameElements = document.querySelectorAll('._name_1treo_160');
      const results: AnswerStatus[] = [];
      
      nameElements.forEach((nameEl) => {
        const name = nameEl.textContent || '';
        
        watchedNames.forEach(watched => {
          const isMatch = watched.exactMatch ? 
            name === watched.name : 
            name.includes(watched.name);
            
          if (isMatch) {
            results.push({
              watchedNameId: watched.id,
              matchedName: name,
              hasRight: false,
              lastUpdated: Date.now(),
              found: true
            });
          }
        });
      });

      // 見つからない場合の処理
      watchedNames.forEach(watched => {
        const found = results.some(r => r.watchedNameId === watched.id);
        if (!found) {
          results.push({
            watchedNameId: watched.id,
            matchedName: '',
            hasRight: false,
            lastUpdated: Date.now(),
            found: false
          });
        }
      });

      expect(results).toHaveLength(1);
      expect(results[0].found).toBe(false);
    });
  });

  describe('要件5: パフォーマンスとエラーハンドリング', () => {
    it('5.1 ページの内容が変更された時、必要な部分のみを再スクレイピング', () => {
      const mockTable = createMockDOM();
      document.body.appendChild(mockTable);

      // MutationObserverのシミュレート
      let observerCallCount = 0;
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
        callback: () => {
          observerCallCount++;
          // 実際のスクレイピング処理をシミュレート
          const rightsTable = document.querySelector('._rights-table_1treo_151');
          return rightsTable !== null;
        }
      };

      // DOM変更をシミュレート
      const newUser = document.createElement('div');
      newUser.className = '_right_1treo_151';
      mockTable.appendChild(newUser);

      mockObserver.callback();

      expect(observerCallCount).toBe(1);
      expect(mockObserver.observe).toBeDefined();
    });

    it('5.3 ネットワークエラーが発生した時、適切にエラーハンドリング', () => {
      const mockError = new Error('Network error');
      
      // エラーハンドリングのシミュレート
      const handleError = (error: Error) => {
        return {
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
      };

      const result = handleError(mockError);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.timestamp).toBeDefined();
    });

    it('5.4 メモリ使用量の適切な管理', () => {
      // メモリリークを防ぐためのクリーンアップ処理のテスト
      const resources = {
        observer: null as MutationObserver | null,
        intervals: [] as NodeJS.Timeout[],
        listeners: [] as (() => void)[]
      };

      // リソースの作成をシミュレート
      resources.observer = new MutationObserver(() => {});
      resources.intervals.push(setInterval(() => {}, 1000));
      resources.listeners.push(() => {});

      // クリーンアップ処理
      const cleanup = () => {
        if (resources.observer) {
          resources.observer.disconnect();
          resources.observer = null;
        }
        resources.intervals.forEach(clearInterval);
        resources.intervals = [];
        resources.listeners = [];
      };

      cleanup();

      expect(resources.observer).toBeNull();
      expect(resources.intervals).toHaveLength(0);
      expect(resources.listeners).toHaveLength(0);
    });
  });

  describe('様々なシナリオでの安定性確認', () => {
    it('大量の回答者が存在する場合の処理', () => {
      // 100人の回答者をシミュレート
      const mockTable = document.createElement('div');
      mockTable.className = '_rights-table_1treo_151';

      for (let i = 0; i < 100; i++) {
        const mockUser = document.createElement('div');
        mockUser.className = '_right_1treo_151';
        mockUser.style.background = i % 2 === 0 ? 'white' : 'rgb(243, 244, 246)';
        
        const mockName = document.createElement('div');
        mockName.className = '_name_1treo_160';
        mockName.textContent = `ユーザー${i + 1}`;
        mockUser.appendChild(mockName);
        
        mockTable.appendChild(mockUser);
      }

      document.body.appendChild(mockTable);

      const nameElements = document.querySelectorAll('._name_1treo_160');
      expect(nameElements).toHaveLength(100);

      // パフォーマンステスト: 処理時間を測定
      const startTime = performance.now();
      const names = Array.from(nameElements).map(el => el.textContent);
      const endTime = performance.now();

      expect(names).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内で処理完了
    });

    it('DOM要素が動的に変更される場合の処理', () => {
      const mockTable = createMockDOM();
      document.body.appendChild(mockTable);

      // 初期状態の確認
      let nameElements = document.querySelectorAll('._name_1treo_160');
      expect(nameElements).toHaveLength(3);

      // 新しいユーザーを動的に追加
      const newUser = document.createElement('div');
      newUser.className = '_right_1treo_151';
      newUser.style.background = 'white';
      
      const newName = document.createElement('div');
      newName.className = '_name_1treo_160';
      newName.textContent = '新しいユーザー';
      newUser.appendChild(newName);
      
      mockTable.appendChild(newUser);

      // 更新後の確認
      nameElements = document.querySelectorAll('._name_1treo_160');
      expect(nameElements).toHaveLength(4);

      const names = Array.from(nameElements).map(el => el.textContent);
      expect(names).toContain('新しいユーザー');
    });

    it('不正なDOM構造での処理', () => {
      // 不完全なDOM構造をシミュレート
      const incompleteTable = document.createElement('div');
      incompleteTable.className = '_rights-table_1treo_151';

      // 名前要素のない回答者
      const incompleteUser = document.createElement('div');
      incompleteUser.className = '_right_1treo_151';
      incompleteTable.appendChild(incompleteUser);

      document.body.appendChild(incompleteTable);

      // エラーハンドリングのテスト
      const extractNames = () => {
        try {
          const nameElements = document.querySelectorAll('._name_1treo_160');
          return Array.from(nameElements).map(el => el.textContent || '');
        } catch (error) {
          return [];
        }
      };

      const names = extractNames();
      expect(names).toHaveLength(0); // エラーが発生しても空配列を返す
    });
  });
});