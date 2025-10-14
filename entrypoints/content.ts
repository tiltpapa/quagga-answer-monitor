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
    console.log('Quagga Monitor Content Script loaded');
    
    // QuaggaMonitorクラスのインスタンスを作成して監視開始
    const monitor = new QuaggaMonitor();
    monitor.initialize();
  },
});

/**
 * Quaggaサイトの回答権監視を行うメインクラス
 */
class QuaggaMonitor {
  private observer: MutationObserver | null = null;
  private watchedNames: WatchedName[] = [];
  private isMonitoring = false;
  private throttleTimer: number | null = null;
  private readonly THROTTLE_DELAY = 500; // 500ms

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
      
      console.log('Quagga Monitor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Quagga Monitor:', error);
      this.sendErrorMessage('初期化に失敗しました', error);
    }
  }

  /**
   * DOM要素スクレイピング機能の実装
   * 要件: 1.2, 1.3, 1.4
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
      
      rightElements.forEach((rightElement) => {
        try {
          // 名前要素を検索
          const nameElement = rightElement.querySelector('._name_1treo_160');
          if (!nameElement) {
            return; // 名前要素が見つからない場合はスキップ
          }

          const name = nameElement.textContent?.trim();
          if (!name) {
            return; // 名前が空の場合はスキップ
          }

          // 回答権の状況を判定（background色で判定）
          const computedStyle = window.getComputedStyle(rightElement);
          const backgroundColor = computedStyle.backgroundColor;
          
          // 白色（rgb(255, 255, 255)またはwhite）の場合は回答権あり
          const hasRight = this.isWhiteBackground(backgroundColor);

          results.push({
            name,
            hasRight,
            timestamp
          });

          console.log(`Extracted: ${name} - ${hasRight ? '回答権あり' : '回答権なし'}`);
        } catch (error) {
          console.error('Error processing right element:', error);
        }
      });

    } catch (error) {
      console.error('Error during DOM extraction:', error);
      this.sendErrorMessage('DOM要素の抽出中にエラーが発生しました', error);
    }

    return results;
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
   * MutationObserverによるリアルタイム監視
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
        this.handleDOMChanges(mutations);
      }, this.THROTTLE_DELAY);
    });

    // 監視対象の設定
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'] // クラスとスタイルの変更のみ監視
    });

    console.log('DOM Observer started');
  }

  /**
   * DOM変更の処理
   */
  private handleDOMChanges(mutations: MutationRecord[]): void {
    let shouldRescan = false;

    for (const mutation of mutations) {
      // 関連する要素の変更かチェック
      if (this.isRelevantChange(mutation)) {
        shouldRescan = true;
        break;
      }
    }

    if (shouldRescan) {
      console.log('Relevant DOM change detected, performing rescan');
      this.performScan();
    }
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
      this.sendErrorMessage('スキャン中にエラーが発生しました', error);
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
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    console.log('Monitoring stopped');
  }

  /**
   * 設定の読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response && response.watchedNames) {
        this.watchedNames = response.watchedNames;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
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
}