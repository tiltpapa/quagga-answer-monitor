import type { Message, MessageType, Settings, MonitorState } from '../../../types/index.js';

/**
 * Background Scriptとの通信を管理するクラス
 */
export class MessagingService {
  private messageId = 0;
  private pendingMessages = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

  /**
   * メッセージIDを生成
   */
  private generateMessageId(): string {
    return `msg_${++this.messageId}_${Date.now()}`;
  }

  /**
   * Background Scriptにメッセージを送信し、レスポンスを待つ
   */
  async sendMessage<T = any>(type: MessageType, payload?: any): Promise<T> {
    const messageId = this.generateMessageId();
    const message: Message = {
      type,
      payload,
      id: messageId
    };

    return new Promise((resolve, reject) => {
      // タイムアウト設定（5秒）
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error(`Message timeout: ${type}`));
      }, 5000);

      this.pendingMessages.set(messageId, { resolve, reject, timeout });

      // Background Scriptにメッセージを送信
      chrome.runtime.sendMessage(message, (response) => {
        const pending = this.pendingMessages.get(messageId);
        if (!pending) return;

        clearTimeout(pending.timeout);
        this.pendingMessages.delete(messageId);

        if (chrome.runtime.lastError) {
          pending.reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.error) {
          pending.reject(new Error(response.error));
        } else {
          // Background Scriptからの直接レスポンスを処理
          pending.resolve(response);
        }
      });
    });
  }

  /**
   * 設定を取得
   */
  async getSettings(): Promise<Settings> {
    console.log('MessagingService: Getting settings...');
    const settings = await this.sendMessage<Settings>('GET_SETTINGS');
    console.log('MessagingService: Received settings:', settings);
    return settings;
  }

  /**
   * 設定を更新
   */
  async updateSettings(settings: Settings): Promise<void> {
    return this.sendMessage('UPDATE_SETTINGS', settings);
  }

  /**
   * 監視状態を取得
   */
  async getStatus(): Promise<MonitorState> {
    return this.sendMessage<MonitorState>('GET_STATUS');
  }

  /**
   * 監視を開始
   */
  async startMonitoring(): Promise<void> {
    return this.sendMessage('START_MONITORING');
  }

  /**
   * 監視を停止
   */
  async stopMonitoring(): Promise<void> {
    return this.sendMessage('STOP_MONITORING');
  }

  /**
   * Background Scriptからのメッセージを受信するリスナーを設定
   */
  onMessage(callback: (message: Message) => void): () => void {
    const listener = (message: Message) => {
      // STATUS_UPDATEメッセージなど、リアルタイム更新用
      if (message.type === 'STATUS_UPDATE') {
        callback(message);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    // リスナーを削除する関数を返す
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }

  /**
   * 未処理のメッセージをクリーンアップ
   */
  cleanup(): void {
    for (const [messageId, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('MessagingService cleanup'));
    }
    this.pendingMessages.clear();
  }
}