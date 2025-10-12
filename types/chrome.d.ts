/**
 * Chrome Extension API の型定義
 * 必要最小限の型のみを定義
 */

declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
    }

    interface Port {
      name: string;
      disconnect(): void;
      onDisconnect: chrome.events.Event<(port: Port) => void>;
      onMessage: chrome.events.Event<(message: any, port: Port) => void>;
      postMessage(message: any): void;
      sender?: MessageSender;
    }

    interface MessageEvent {
      addListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void): void;
      removeListener(callback: (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void): void;
    }

    const onMessage: MessageEvent;
    
    function sendMessage(message: any): Promise<any>;
    function sendMessage(extensionId: string, message: any): Promise<any>;
  }

  namespace events {
    interface Event<T extends Function> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
      hasListener(callback: T): boolean;
    }
  }

  namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      openerTabId?: number;
      selected: boolean;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      audible?: boolean;
      discarded: boolean;
      autoDiscardable: boolean;
      mutedInfo?: MutedInfo;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
    }

    interface MutedInfo {
      muted: boolean;
      reason?: string;
      extensionId?: string;
    }
  }
  namespace storage {
    interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }

    interface StorageArea {
      get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
      getBytesInUse(keys?: string | string[] | null): Promise<number>;
    }

    interface StorageAreaSync extends StorageArea {
      QUOTA_BYTES: number;
      QUOTA_BYTES_PER_ITEM: number;
      MAX_ITEMS: number;
      MAX_WRITE_OPERATIONS_PER_HOUR: number;
      MAX_WRITE_OPERATIONS_PER_MINUTE: number;
    }

    interface StorageAreaLocal extends StorageArea {
      QUOTA_BYTES: number;
    }

    const local: StorageAreaLocal;
    const sync: StorageAreaSync;

    interface StorageChangedEvent {
      addListener(callback: (changes: { [key: string]: StorageChange }, areaName: string) => void): void;
      removeListener(callback: (changes: { [key: string]: StorageChange }, areaName: string) => void): void;
    }

    const onChanged: StorageChangedEvent;
  }
}