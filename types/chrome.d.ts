/**
 * Chrome Extension API の型定義
 * 必要最小限の型のみを定義
 */

declare namespace chrome {
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