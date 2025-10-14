<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WatchedName } from '../../../types/index.js';

  // Props
  export let watchedName: WatchedName;

  // イベントディスパッチャー
  const dispatch = createEventDispatcher<{
    update: Partial<WatchedName>;
    delete: void;
  }>();

  // 編集状態
  let isEditing = false;
  let editingName = watchedName.name;
  let editError = '';

  /**
   * 編集モードを開始
   */
  function startEditing() {
    isEditing = true;
    editingName = watchedName.name;
    editError = '';
    
    // 次のティックでフォーカス
    setTimeout(() => {
      const input = document.querySelector(`#edit-input-${watchedName.id}`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  /**
   * 編集をキャンセル
   */
  function cancelEditing() {
    isEditing = false;
    editingName = watchedName.name;
    editError = '';
  }

  /**
   * 編集を保存
   */
  function saveEdit() {
    const trimmedName = editingName.trim();
    
    // バリデーション
    if (!trimmedName) {
      editError = '名前を入力してください';
      return;
    }

    if (trimmedName.length > 100) {
      editError = '名前は100文字以内で入力してください';
      return;
    }

    if (trimmedName === watchedName.name) {
      // 変更がない場合は編集モードを終了
      isEditing = false;
      editError = '';
      return;
    }

    // 親コンポーネントに更新を通知
    dispatch('update', { name: trimmedName });
    isEditing = false;
    editError = '';
  }

  /**
   * キーボードイベントハンドラー
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      saveEdit();
    } else if (event.key === 'Escape') {
      cancelEditing();
    }
  }

  /**
   * 有効/無効トグル
   */
  function toggleEnabled() {
    dispatch('update', { enabled: !watchedName.enabled });
  }

  /**
   * 検索モード切り替え
   */
  function toggleExactMatch() {
    dispatch('update', { exactMatch: !watchedName.exactMatch });
  }

  /**
   * 削除
   */
  function handleDelete() {
    if (confirm(`「${watchedName.name}」を削除しますか？`)) {
      dispatch('delete');
    }
  }
</script>

<div class="bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 {!watchedName.enabled ? 'opacity-60' : ''}">
  <div class="flex items-center justify-between">
    <div class="flex-1 min-w-0">
      <div class="flex items-center space-x-3">
        <!-- 有効/無効トグル -->
        <label class="flex items-center cursor-pointer" title={watchedName.enabled ? '監視を無効にする' : '監視を有効にする'}>
          <input
            type="checkbox"
            checked={watchedName.enabled}
            on:change={toggleEnabled}
            class="sr-only"
          />
          <div class="relative">
            <div class="w-10 h-6 bg-gray-200 rounded-full shadow-inner transition-colors duration-200 {watchedName.enabled ? 'bg-blue-600' : ''}"></div>
            <div class="absolute w-4 h-4 bg-white rounded-full shadow top-1 transition-transform duration-200 {watchedName.enabled ? 'transform translate-x-4' : 'left-1'}"></div>
          </div>
        </label>

        <!-- 名前表示/編集 -->
        <div class="flex-1">
          {#if isEditing}
            <div class="space-y-2">
              <input
                id="edit-input-{watchedName.id}"
                type="text"
                bind:value={editingName}
                on:keydown={handleKeydown}
                on:blur={saveEdit}
                class="w-full px-2 py-1 text-sm font-medium border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="名前を入力"
              />
              {#if editError}
                <p class="text-xs text-red-600">{editError}</p>
              {/if}
            </div>
          {:else}
            <button
              on:click={startEditing}
              class="text-left w-full group"
              title="クリックして編集"
            >
              <p class="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-150">
                {watchedName.name}
              </p>
              <p class="text-xs text-gray-500">
                {watchedName.exactMatch ? '完全一致' : '部分一致'}で検索
                <span class="text-gray-400 ml-1">（クリックで編集）</span>
              </p>
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- 操作ボタン -->
    {#if !isEditing}
      <div class="flex items-center space-x-2 ml-4">
        <!-- 検索モード切り替え -->
        <button
          on:click={toggleExactMatch}
          class="px-2 py-1 text-xs font-medium rounded border transition-colors duration-150 {watchedName.exactMatch ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          title={watchedName.exactMatch ? '完全一致モード（クリックで部分一致に変更）' : '部分一致モード（クリックで完全一致に変更）'}
        >
          {watchedName.exactMatch ? '完全' : '部分'}
        </button>

        <!-- 編集ボタン -->
        <button
          on:click={startEditing}
          class="p-1 text-gray-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded transition-colors duration-150"
          title="名前を編集"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>

        <!-- 削除ボタン -->
        <button
          on:click={handleDelete}
          class="p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded transition-colors duration-150"
          title="削除"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    {:else}
      <!-- 編集中の操作ボタン -->
      <div class="flex items-center space-x-2 ml-4">
        <button
          on:click={saveEdit}
          class="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-150"
          title="保存 (Enter)"
        >
          保存
        </button>
        <button
          on:click={cancelEditing}
          class="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors duration-150"
          title="キャンセル (Esc)"
        >
          キャンセル
        </button>
      </div>
    {/if}
  </div>
</div>