/**
 * Quagga回答監視アドオン - Content Script
 * quagga.studioサイトでDOM要素をスクレイピングし、回答権の状況を監視する
 */

/// <reference path="../types/chrome.d.ts" />
/// <reference path="../types/wxt.d.ts" />

import type { AnswerRightData, WatchedName, Message, StatusUpdateMessage, AnswerStatus } from '../types/index';

export default defineContentScript({
  matches: ['*://quagga.studio/*'],
  main() {
    // ドメイン制限の実装 - 要件: 1.1, 4.4
    if (!isValidDomain()) {
      console.log('Quagga Monitor: Invalid domain, script will not execute');
      return;
    }

    console.log('Quagga Monitor Content Script loaded');
    
    // QuaggaMonitorクラスのインスタンスを作成して監視開始
    const monitor = new QuaggaMonitor();
    monitor.initialize();
  },
});

/**
 * 有効なドメインかどうかをチェック
 * 要件: 1.1, 4.4
 */
function isValidDomain(): boolean {
  const hostname = window.location.hostname;
  const validDomains = ['quagga.studio'];
  
  return validDomains.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );
}

/**
 * Quaggaサイトの回答権監視を行うメインクラス
 */
class QuaggaMonitor {
  private observer: MutationObserver | null = null;
  private watchedNames: WatchedName[] = [];
  private isMonitoring = false;
  private throttleTimer: number | null = null;
  private readonly THROTTLE_DELAY = 500; // 500ms
  
  // パフォーマンス最適化のための追加プロパティ - 要件: 5.1, 5.2
  private lastScanResults: AnswerRightData[] = [];
  private scanCount = 0;
  private readonly MAX_SCAN_HISTORY = 10;
  private readonly MEMORY_CLEANUP_INTERVAL = 60000; // 1分
  private memoryCleanupTimer: number | null = null;
  private readonly EFFICIENT_SEARCH_THRESHOLD = 50; // 50人以上で効率的検索を使用

  /**
   * 監視システムの初期化
   */
  async initialize(): Promise<void> {
    try {
      // Background Scriptから設定を取得
      await this.loadSettings();
      
      // 初回スキャン実行
      this.performScan();
      
      // DOM変更の監視開始
      this.startDOMObserver();
      
      // Background Scriptからのメッセージリスナー設定
      this.setupMessageListener();

      // メモリクリーンアップタイマーを開始
      this.startMemoryCleanup();
      
      console.log('Quagga Monitor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Quagga Monitor:', error);
      this.handleError('初期化エラー', '監視システムの初期化に失敗しました', error);
    }
  }

  /**
   * DOM要素スクレイピング機能の実装（パフォーマンス最適化版）
   * 要件: 1.2, 1.3, 1.4, 5.1, 5.2
   */
  extractAnswerRights(): AnswerRightData[] {
    const results: AnswerRightData[] = [];
    const timestamp = Date.now();

    try {
      // ui-empty-stateクラスの要素が存在する場合は参加状況が取得できない
      const emptyState = document.querySelector('.ui-empty-state');
      if (emptyState) {
        console.log('Empty state detected - no participants data available');
        return results;
      }

      // _rights-table_1treo_151クラスの要素を検索
      const rightsTable = document.querySelector('._rights-table_1treo_151');
      if (!rightsTable) {
        console.log('Rights table not found');
        return results;
      }

      // テーブル内の各行を処理
      const rightElements = rightsTable.querySelectorAll('._right_1treo_151');
      
      // 効率的な検索を使用するかどうかを判定
      const useEfficientSearch = rightElements.length > this.EFFICIENT_SEARCH_THRESHOLD;
      
      if (useEfficientSearch) {
        // 大量の参加者がいる場合は効率的な検索を使用
        this.extractWithEfficientSearch(rightElements, results, timestamp);
      } else {
        // 通常の検索を使用
        this.extractWithNormalSearch(rightElements, results, timestamp);
      }

      // スキャン結果をキャッシュ（メモリ管理のため最新のもののみ保持）
      this.lastScanResults = results.slice(); // シャローコピー
      this.scanCount++;

    } catch (error) {
      console.error('Error during DOM extraction:', error);
      this.handleError('DOM抽出エラー', 'DOM要素の抽出中にエラーが発生しました', error);
    }

    return results;
  }

  /**
   * 通常の検索処理
   */
  private extractWithNormalSearch(rightElements: NodeListOf<Element>, results: AnswerRightData[], timestamp: number): void {
    rightElements.forEach((rightElement) => {
      try {
        const extractedData = this.extractSingleElement(rightElement, timestamp);
        if (extractedData) {
          results.push(extractedData);
        }
      } catch (error) {
        console.error('Error processing right element:', error);
        this.handleError('DOM処理エラー', '回答権要素の処理中にエラーが発生しました', error);
      }
    });
  }

  /**
   * 効率的な検索処理（大量の参加者向け）
   */
  private extractWithEfficientSearch(rightElements: NodeListOf<Element>, results: AnswerRightData[], timestamp: number): void {
    // 監視対象名前がない場合は処理をスキップ
    if (this.watchedNames.length === 0) {
      console.log('No watched names configured, skipping efficient search');
      return;
    }

    // 監視対象名前のセットを作成（高速検索用）
    const watchedNameSet = new Set(
      this.watchedNames
        .filter(wn => wn.enabled)
        .map(wn => wn.exactMatch ? wn.name : wn.name.toLowerCase())
    );

    // 部分一致用の配列
    const partialMatchNames = this.watchedNames
      .filter(wn => wn.enabled && !wn.exactMatch)
      .map(wn => wn.name.toLowerCase());

    for (let i = 0; i < rightElements.length; i++) {
      try {
        const rightElement = rightElements[i];
        const nameElement = rightElement.querySelector('._name_1treo_160');
        
        if (!nameElement) continue;
        
        const name = nameElement.textContent?.trim();
        if (!name) continue;

        // 効率的な名前マッチング
        const isMatched = this.isNameMatchedEfficient(name, watchedNameSet, partialMatchNames);
        
        if (isMatched) {
          const extractedData = this.extractSingleElement(rightElement, timestamp);
          if (extractedData) {
            results.push(extractedData);
          }
        }
      } catch (error) {
        console.error('Error processing right element in efficient search:', error);
      }
    }

    console.log(`Efficient search completed: ${results.length} matches found from ${rightElements.length} participants`);
  }

  /**
   * 単一要素の抽出
   */
  private extractSingleElement(rightElement: Element, timestamp: number): AnswerRightData | null {
    // 名前要素を検索
    const nameElement = rightElement.querySelector('._name_1treo_160');
    if (!nameElement) {
      return null;
    }

    const name = nameElement.textContent?.trim();
    if (!name) {
      return null;
    }

    // 回答権の状況を判定（background色で判定）
    const computedStyle = window.getComputedStyle(rightElement);
    const backgroundColor = computedStyle.backgroundColor;
    
    // 白色（rgb(255, 255, 255)またはwhite）の場合は回答権あり
    const hasRight = this.isWhiteBackground(backgroundColor);

    return {
      name,
      hasRight,
      timestamp
    };
  }

  /**
   * 効率的な名前マッチング
   */
  private isNameMatchedEfficient(name: string, exactMatchSet: Set<string>, partialMatchNames: string[]): boolean {
    // 完全一致チェック
    if (exactMatchSet.has(name)) {
      return true;
    }

    // 部分一致チェック
    const lowerName = name.toLowerCase();
    if (exactMatchSet.has(lowerName)) {
      return true;
    }

    // 部分一致の名前をチェック
    return partialMatchNames.some(partialName => lowerName.includes(partialName));
  }

  /**
   * 背景色が白かどうかを判定
   */
  private isWhiteBackground(backgroundColor: string): boolean {
    // RGB値を正規化して白色かどうか判定
    const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      // 白色またはほぼ白色（RGB値が240以上）の場合は回答権ありと判定
      return r >= 240 && g >= 240 && b >= 240;
    }
    
    // 色名での判定
    return backgroundColor === 'white' || backgroundColor === 'rgb(255, 255, 255)';
  }

  /**
   * 名前マッチング機能の実装
   * 要件: 2.4
   */
  checkNameMatch(extractedName: string, watchedName: WatchedName): boolean {
    if (!watchedName.enabled) {
      return false;
    }

    const targetName = watchedName.name.trim();
    const sourceName = extractedName.trim();

    if (watchedName.exactMatch) {
      // 完全一致
      return sourceName === targetName;
    } else {
      // 部分一致（大文字小文字を区別しない）
      return sourceName.toLowerCase().includes(targetName.toLowerCase());
    }
  }

  /**
   * MutationObserverによるリアルタイム監視（パフォーマンス最適化版）
   * 要件: 3.4, 5.1
   */
  private startDOMObserver(): void {
    // 既存のオブザーバーがあれば停止
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      // パフォーマンス最適化のためのthrottling
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
      }

      this.throttleTimer = window.setTimeout(() => {
        this.handleDOMChangesOptimized(mutations);
      }, this.THROTTLE_DELAY);
    });

    // 監視対象を最適化（必要最小限の要素のみ監視）
    const targetElement = document.querySelector('._rights-table_1treo_151') || document.body;
    
    this.observer.observe(targetElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'] // クラスとスタイルの変更のみ監視
    });

    console.log('Optimized DOM Observer started, monitoring:', targetElement.tagName);
  }

  /**
   * DOM変更の処理（最適化版）
   */
  private handleDOMChangesOptimized(mutations: MutationRecord[]): void {
    // 変更の重要度を評価
    const changeAnalysis = this.analyzeMutations(mutations);
    
    if (changeAnalysis.shouldRescan) {
      console.log(`Relevant DOM change detected (${changeAnalysis.changeType}), performing rescan`);
      this.performScan();
    } else {
      console.log('DOM change detected but not relevant for monitoring');
    }
  }

  /**
   * Mutationの分析（パフォーマンス最適化）
   */
  private analyzeMutations(mutations: MutationRecord[]): { shouldRescan: boolean; changeType: string } {
    let hasRelevantChange = false;
    let changeType = 'none';
    let relevantChangeCount = 0;

    for (const mutation of mutations) {
      if (this.isRelevantChange(mutation)) {
        hasRelevantChange = true;
        relevantChangeCount++;
        
        // 変更タイプを特定
        if (mutation.type === 'childList') {
          changeType = 'structure';
        } else if (mutation.type === 'attributes') {
          changeType = 'style';
        }

        // 大量の変更がある場合は早期終了
        if (relevantChangeCount > 10) {
          changeType = 'bulk';
          break;
        }
      }
    }

    return {
      shouldRescan: hasRelevantChange,
      changeType
    };
  }

  /**
   * 監視に関連する変更かどうかを判定
   */
  private isRelevantChange(mutation: MutationRecord): boolean {
    const relevantClasses = [
      '_rights-table_1treo_151',
      '_right_1treo_151',
      '_name_1treo_160',
      'ui-empty-state'
    ];

    // 追加・削除されたノードをチェック
    const checkNodes = (nodes: NodeList) => {
      for (const node of Array.from(nodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          // 関連するクラスを持つ要素かチェック
          if (relevantClasses.some(cls => element.classList?.contains(cls))) {
            return true;
          }
          // 子要素に関連するクラスがあるかチェック
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

  /**
   * スキャンの実行
   */
  private performScan(): void {
    if (!this.isMonitoring) {
      return;
    }

    try {
      const extractedData = this.extractAnswerRights();
      const matchedResults = this.processExtractedData(extractedData);
      
      // Background Scriptに結果を送信
      this.sendStatusUpdate(matchedResults);
    } catch (error) {
      console.error('Error during scan:', error);
      this.handleError('スキャンエラー', 'スキャン中にエラーが発生しました', error);
    }
  }

  /**
   * 抽出されたデータを処理してマッチング結果を生成
   */
  private processExtractedData(extractedData: AnswerRightData[]): AnswerStatus[] {
    const results: AnswerStatus[] = [];
    const timestamp = Date.now();

    for (const watchedName of this.watchedNames) {
      if (!watchedName.enabled) {
        continue;
      }

      // マッチする名前を検索
      const matchedData = extractedData.find(data => 
        this.checkNameMatch(data.name, watchedName)
      );

      if (matchedData) {
        results.push({
          watchedNameId: watchedName.id,
          matchedName: matchedData.name,
          hasRight: matchedData.hasRight,
          lastUpdated: timestamp,
          found: true
        });
      } else {
        results.push({
          watchedNameId: watchedName.id,
          matchedName: '',
          hasRight: false,
          lastUpdated: timestamp,
          found: false
        });
      }
    }

    return results;
  }

  /**
   * Background Scriptとのメッセージング
   * 要件: 1.1, 5.3
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      this.handleMessage(message).then(sendResponse).catch(error => {
        console.error('Error handling message:', error);
        this.handleError('メッセージングエラー', 'メッセージの処理中にエラーが発生しました', error);
        sendResponse({ error: error.message });
      });
      return true; // 非同期レスポンスを示す
    });
  }

  /**
   * メッセージハンドリング
   */
  private async handleMessage(message: Message): Promise<any> {
    switch (message.type) {
      case 'START_MONITORING':
        await this.startMonitoring();
        return { success: true };

      case 'STOP_MONITORING':
        this.stopMonitoring();
        return { success: true };

      case 'UPDATE_SETTINGS':
        if (message.payload) {
          this.watchedNames = message.payload.watchedNames || [];
          // 設定更新後に再スキャン
          this.performScan();
        }
        return { success: true };

      default:
        console.warn('Unknown message type:', message.type);
        return { error: 'Unknown message type' };
    }
  }

  /**
   * 監視開始
   */
  private async startMonitoring(): Promise<void> {
    this.isMonitoring = true;
    await this.loadSettings();
    this.performScan();
    console.log('Monitoring started');
  }

  /**
   * 監視停止
   */
  private stopMonitoring(): void {
    this.isMonitoring = false;
    
    // オブザーバーの停止
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // タイマーのクリーンアップ
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    
    // メモリクリーンアップタイマーの停止
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
      this.memoryCleanupTimer = null;
    }
    
    // メモリクリーンアップ
    this.performMemoryCleanup();
    
    console.log('Monitoring stopped and memory cleaned up');
  }

  /**
   * メモリクリーンアップの開始 - 要件: 5.1, 5.2
   */
  private startMemoryCleanup(): void {
    this.memoryCleanupTimer = window.setInterval(() => {
      this.performMemoryCleanup();
    }, this.MEMORY_CLEANUP_INTERVAL);
  }

  /**
   * メモリクリーンアップの実行
   */
  private performMemoryCleanup(): void {
    try {
      // 古いスキャン結果をクリア
      if (this.lastScanResults.length > this.MAX_SCAN_HISTORY) {
        this.lastScanResults = this.lastScanResults.slice(-this.MAX_SCAN_HISTORY);
      }

      // スキャンカウントのリセット（オーバーフロー防止）
      if (this.scanCount > 10000) {
        this.scanCount = 0;
      }

      console.log(`Memory cleanup performed. Scan count: ${this.scanCount}, Cached results: ${this.lastScanResults.length}`);
    } catch (error) {
      console.error('Error during memory cleanup:', error);
    }
  }

  /**
   * 設定の読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response && response.watchedNames) {
        this.watchedNames = response.watchedNames;
      } else if (response && response.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.handleError('ストレージエラー', '設定の読み込みに失敗しました', error);
      this.watchedNames = [];
    }
  }

  /**
   * 状況更新の送信
   */
  private sendStatusUpdate(statuses: AnswerStatus[]): void {
    const message: StatusUpdateMessage = {
      type: 'STATUS_UPDATE',
      payload: {
        statuses,
        isActive: this.isMonitoring,
        lastScan: Date.now()
      }
    };

    chrome.runtime.sendMessage(message).catch(error => {
      console.error('Failed to send status update:', error);
    });
  }

  /**
   * エラーメッセージの送信
   */
  private sendErrorMessage(message: string, error: any): void {
    const errorMessage: Message = {
      type: 'ERROR',
      payload: {
        message,
        details: error?.message || error
      }
    };

    chrome.runtime.sendMessage(errorMessage).catch(err => {
      console.error('Failed to send error message:', err);
    });
  }

  /**
   * 包括的エラーハンドリング - 要件: 5.3, 5.4
   */
  private handleError(category: string, userMessage: string, error: any): void {
    const errorDetails = {
      category,
      userMessage,
      technicalDetails: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console.error(`[${category}]`, errorDetails);

    // Background Scriptにエラー情報を送信
    this.sendErrorMessage(userMessage, errorDetails);

    // 重要なエラーの場合は監視を一時停止
    if (this.isCriticalError(category)) {
      console.warn('Critical error detected, pausing monitoring');
      this.isMonitoring = false;
    }
  }

  /**
   * 重要なエラーかどうかを判定
   */
  private isCriticalError(category: string): boolean {
    const criticalCategories = [
      '初期化エラー',
      'ストレージエラー',
      'メッセージングエラー'
    ];
    return criticalCategories.includes(category);
  }
}