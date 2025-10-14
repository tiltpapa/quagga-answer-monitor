<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Settings, WatchedName } from '../../../types/index.js';
  import { MessagingService } from '../utils/messaging.js';
  import { SettingsValidator } from '../../../utils/settings-validator.js';
  import NameItem from './NameItem.svelte';

  // 状態管理
  let settings: Settings = { watchedNames: [], refreshInterval: 1000 };
  let loading = true;
  let error = '';
  let successMessage = '';
  let newNameInput = '';
  let isAddingName = false;

  // 成功メッセージを一定時間後に消去
  let successTimeout: NodeJS.Timeout;

  // メッセージングサービス
  const messaging = new MessagingService();

  /**
   * 設定を読み込み
   */
  async function loadSettings() {
    try {
      loading = true;
      error = '';
      
      const loadedSettings = await messaging.getSettings();
      
      // 設定をサニタイズして安全な形式に変換
      settings = SettingsValidator.sanitizeSettings(loadedSettings);
    } catch (err) {
      error = `設定の読み込みに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`;
      console.error('Failed to load settings:', err);
      
      // エラーの場合はデフォルト設定を使用
      settings = SettingsValidator.mergeWithDefaults({});
    } finally {
      loading = false;
    }
  }

  /**
   * 設定を保存
   */
  async function saveSettings() {
    try {
      error = '';
      successMessage = '';
      
      // 設定をサニタイズ
      const sanitizedSettings = SettingsValidator.sanitizeSettings(settings);
      
      // バリデーション
      if (!SettingsValidator.isValidSettings(sanitizedSettings)) {
        throw new Error('設定データが無効です');
      }

      await messaging.updateSettings(sanitizedSettings);
      
      // 成功した場合は、サニタイズされた設定で更新
      settings = sanitizedSettings;
      
      // 成功メッセージを表示
      showSuccessMessage('設定を保存しました');
    } catch (err) {
      error = `設定の保存に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`;
      console.error('Failed to save settings:', err);
      throw err;
    }
  }

  /**
   * 成功メッセージを表示
   */
  function showSuccessMessage(message: string) {
    successMessage = message;
    
    // 既存のタイムアウトをクリア
    if (successTimeout) {
      clearTimeout(successTimeout);
    }
    
    // 3秒後にメッセージを消去
    successTimeout = setTimeout(() => {
      successMessage = '';
    }, 3000);
  }

  /**
   * 新しい名前を追加
   */
  async function addNewName() {
    const trimmedName = newNameInput.trim();
    
    // 入力値の検証
    if (!trimmedName) {
      error = '名前を入力してください';
      return;
    }

    if (trimmedName.length > 100) {
      error = '名前は100文字以内で入力してください';
      return;
    }

    // 重複チェック
    if (SettingsValidator.hasDuplicateName(settings.watchedNames, trimmedName)) {
      error = 'この名前は既に登録されています';
      return;
    }

    try {
      isAddingName = true;
      error = '';

      const newWatchedName = SettingsValidator.createWatchedName(trimmedName, false);
      settings.watchedNames = [...settings.watchedNames, newWatchedName];
      
      await saveSettings();
      newNameInput = '';
    } catch (err) {
      // エラーは saveSettings で処理済み
    } finally {
      isAddingName = false;
    }
  }

  /**
   * 名前を削除
   */
  async function deleteName(id: string) {
    try {
      error = '';
      settings.watchedNames = settings.watchedNames.filter(wn => wn.id !== id);
      await saveSettings();
    } catch (err) {
      // エラーは saveSettings で処理済み
      // 削除に失敗した場合は元に戻す
      await loadSettings();
    }
  }

  /**
   * 名前を更新
   */
  async function updateName(id: string, updates: Partial<WatchedName>) {
    // 名前の更新の場合はバリデーション
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      
      if (!trimmedName) {
        error = '名前を入力してください';
        return;
      }

      if (trimmedName.length > 100) {
        error = '名前は100文字以内で入力してください';
        return;
      }

      // 重複チェック（自分以外）
      if (SettingsValidator.hasDuplicateName(settings.watchedNames, trimmedName, id)) {
        error = 'この名前は既に登録されています';
        return;
      }

      updates.name = trimmedName;
    }

    try {
      error = '';
      const originalSettings = { ...settings };
      
      settings.watchedNames = settings.watchedNames.map(wn => 
        wn.id === id ? { ...wn, ...updates } : wn
      );
      
      await saveSettings();
    } catch (err) {
      // エラーは saveSettings で処理済み
      // 更新に失敗した場合は元に戻す
      await loadSettings();
    }
  }

  /**
   * Enter キーで名前を追加
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !isAddingName) {
      addNewName();
    }
  }

  // コンポーネントマウント時に設定を読み込み
  onMount(() => {
    loadSettings();
  });

  // コンポーネント破棄時にクリーンアップ
  onDestroy(() => {
    messaging.cleanup();
    if (successTimeout) {
      clearTimeout(successTimeout);
    }
  });
</script>

<div class="p-4 space-y-6">
  <!-- ヘッダー -->
  <div class="border-b border-gray-200 pb-4">
    <h2 class="text-lg font-semibold text-gray-900">監視対象設定</h2>
    <p class="text-sm text-gray-600 mt-1">監視したい回答者の名前を設定します</p>
  </div>

  <!-- エラー表示 -->
  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-md p-3">
      <div class="flex">
        <div class="text-red-400 mr-2">⚠️</div>
        <div class="text-sm text-red-700">{error}</div>
      </div>
    </div>
  {/if}

  <!-- 成功メッセージ表示 -->
  {#if successMessage}
    <div class="bg-green-50 border border-green-200 rounded-md p-3">
      <div class="flex">
        <div class="text-green-400 mr-2">✅</div>
        <div class="text-sm text-green-700">{successMessage}</div>
      </div>
    </div>
  {/if}

  <!-- ローディング表示 -->
  {#if loading}
    <div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <p class="text-sm text-gray-600 mt-2">設定を読み込み中...</p>
    </div>
  {:else}
    <!-- 新しい名前の追加フォーム -->
    <div class="bg-gray-50 rounded-lg p-4">
      <h3 class="text-sm font-medium text-gray-900 mb-3">新しい名前を追加</h3>
      <div class="flex space-x-2">
        <input
          type="text"
          bind:value={newNameInput}
          on:keydown={handleKeydown}
          placeholder="監視したい回答者名を入力"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isAddingName}
        />
        <button
          on:click={addNewName}
          disabled={isAddingName || !newNameInput.trim()}
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isAddingName}
            <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          {:else}
            追加
          {/if}
        </button>
      </div>
    </div>

    <!-- 監視対象名前一覧 -->
    <div>
      <h3 class="text-sm font-medium text-gray-900 mb-3">
        監視対象一覧 ({settings.watchedNames.length}件)
      </h3>
      
      {#if settings.watchedNames.length === 0}
        <div class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">👤</div>
          <p class="text-sm">監視対象が設定されていません</p>
          <p class="text-xs text-gray-400 mt-1">上のフォームから名前を追加してください</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each settings.watchedNames as watchedName (watchedName.id)}
            <NameItem
              {watchedName}
              on:update={(event) => updateName(watchedName.id, event.detail)}
              on:delete={() => deleteName(watchedName.id)}
            />
          {/each}
        </div>
      {/if}
    </div>

    <!-- 設定情報 -->
    <div class="bg-blue-50 rounded-lg p-4">
      <h3 class="text-sm font-medium text-blue-900 mb-2">設定について</h3>
      <ul class="text-xs text-blue-800 space-y-1">
        <li>• <strong>部分一致</strong>: 入力した文字列が含まれる名前を検索します</li>
        <li>• <strong>完全一致</strong>: 入力した文字列と完全に一致する名前のみを検索します</li>
        <li>• 無効にした名前は監視対象から除外されます</li>
        <li>• 設定は自動的に保存されます</li>
      </ul>
    </div>
  {/if}
</div>