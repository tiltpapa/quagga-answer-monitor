/**
 * Quagga回答監視アドオンの型定義
 */

// 監視対象名前の設定
export interface WatchedName {
  /** 一意識別子 */
  id: string;
  /** 監視対象の名前 */
  name: string;
  /** 完全一致検索かどうか（false = 部分一致） */
  exactMatch: boolean;
  /** 監視が有効かどうか */
  enabled: boolean;
}

// アプリケーション設定
export interface Settings {
  /** 監視対象名前のリスト */
  watchedNames: WatchedName[];
  /** スキャン間隔（ミリ秒） */
  refreshInterval: number;
}

// 回答権の状況データ
export interface AnswerStatus {
  /** 対応する監視対象名前のID */
  watchedNameId: string;
  /** 実際にマッチした名前 */
  matchedName: string;
  /** 回答権を持っているかどうか */
  hasRight: boolean;
  /** 最終更新時刻 */
  lastUpdated: number;
  /** 名前が見つかったかどうか */
  found: boolean;
}

// 監視状態の管理
export interface MonitorState {
  /** 各監視対象の状況 */
  statuses: AnswerStatus[];
  /** 監視が有効かどうか */
  isActive: boolean;
  /** 最終スキャン時刻 */
  lastScan: number;
}

// メッセージタイプの定義
export type MessageType = 
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_STATUS'
  | 'STATUS_UPDATE'
  | 'START_MONITORING'
  | 'STOP_MONITORING'
  | 'ERROR';

// メッセージの基本構造
export interface Message {
  /** メッセージタイプ */
  type: MessageType;
  /** メッセージのペイロード */
  payload?: any;
  /** メッセージID（応答の関連付け用） */
  id?: string;
}

// 特定のメッセージタイプ
export interface GetSettingsMessage extends Message {
  type: 'GET_SETTINGS';
}

export interface UpdateSettingsMessage extends Message {
  type: 'UPDATE_SETTINGS';
  payload: Settings;
}

export interface GetStatusMessage extends Message {
  type: 'GET_STATUS';
}

export interface StatusUpdateMessage extends Message {
  type: 'STATUS_UPDATE';
  payload: MonitorState;
}

export interface StartMonitoringMessage extends Message {
  type: 'START_MONITORING';
}

export interface StopMonitoringMessage extends Message {
  type: 'STOP_MONITORING';
}

export interface ErrorMessage extends Message {
  type: 'ERROR';
  payload: {
    message: string;
    code?: string;
    details?: any;
  };
}

// 回答権データ（Content Scriptで抽出される生データ）
export interface AnswerRightData {
  /** 回答者名 */
  name: string;
  /** 回答権を持っているかどうか */
  hasRight: boolean;
  /** データ取得時刻 */
  timestamp: number;
}

// デフォルト設定
export const DEFAULT_SETTINGS: Settings = {
  watchedNames: [],
  refreshInterval: 1000, // 1秒
};

// ストレージキー
export const STORAGE_KEYS = {
  SETTINGS: 'quagga_monitor_settings',
  MONITOR_STATE: 'quagga_monitor_state',
} as const;