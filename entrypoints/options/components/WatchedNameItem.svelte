<script lang="ts">
  import { optionsStore } from '../stores/optionsStore.js';
  import type { WatchedName } from '../../../../types/index';

  export let watchedName: WatchedName;

  let isEditing = false;
  let editName = watchedName.name;
  let editExactMatch = watchedName.exactMatch;
  let isUpdating = false;

  function startEdit() {
    isEditing = true;
    editName = watchedName.name;
    editExactMatch = watchedName.exactMatch;
  }

  function cancelEdit() {
    isEditing = false;
    editName = watchedName.name;
    editExactMatch = watchedName.exactMatch;
  }

  async function saveEdit() {
    if (!editName.trim() || isUpdating) return;

    isUpdating = true;
    try {
      const success = await optionsStore.updateWatchedName(watchedName.id, {
        name: editName.trim(),
        exactMatch: editExactMatch
      });
      
      if (success) {
        isEditing = false;
      }
    } finally {
      isUpdating = false;
    }
  }

  async function toggleEnabled() {
    if (isUpdating) return;

    isUpdating = true;
    try {
      await optionsStore.updateWatchedName(watchedName.id, {
        enabled: !watchedName.enabled
      });
    } finally {
      isUpdating = false;
    }
  }

  async function remove() {
    if (isUpdating) return;
    
    if (!confirm(`「${watchedName.name}」を削除しますか？`)) return;

    isUpdating = true;
    try {
      await optionsStore.removeWatchedName(watchedName.id);
    } finally {
      isUpdating = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }
</script>

<div class="bg-white border border-gray-200 rounded-lg p-4 {watchedName.enabled ? '' : 'opacity-60'}">
  <div class="flex items-center justify-between">
    <!-- 左側: 名前と設定 -->
    <div class="flex-1 min-w-0">
      {#if isEditing}
        <!-- 編集モード -->
        <div class="space-y-3">
          <input
            type="text"
            bind:value={editName}
            on:keydown={handleKeydown}
            class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isUpdating}
            placeholder="監視対象の名前"
          />
          <div class="flex items-center">
            <input
              id="edit-exact-match-{watchedName.id}"
              type="checkbox"
              bind:checked={editExactMatch}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isUpdating}
            />
            <label for="edit-exact-match-{watchedName.id}" class="ml-2 block text-sm text-gray-700">
              完全一致で検索
            </label>
          </div>
          <div class="flex space-x-2">
            <button
              on:click={saveEdit}
              disabled={!editName.trim() || isUpdating}
              class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isUpdating}
                <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
              {/if}
              保存
            </button>
            <button
              on:click={cancelEdit}
              disabled={isUpdating}
              class="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      {:else}
        <!-- 表示モード -->
        <div class="space-y-2">
          <div class="flex items-center space-x-2">
            <h3 class="text-sm font-medium text-gray-900 truncate">
              {watchedName.name}
            </h3>
            {#if watchedName.exactMatch}
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                完全一致
              </span>
            {:else}
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                部分一致
              </span>
            {/if}
          </div>
          <div class="flex items-center space-x-4">
            <!-- 有効/無効切り替え -->
            <label class="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={watchedName.enabled}
                on:change={toggleEnabled}
                disabled={isUpdating}
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-600">
                {watchedName.enabled ? '有効' : '無効'}
              </span>
            </label>
          </div>
        </div>
      {/if}
    </div>

    <!-- 右側: アクション -->
    {#if !isEditing}
      <div class="flex items-center space-x-2 ml-4">
        <button
          on:click={startEdit}
          disabled={isUpdating}
          class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="編集"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button
          on:click={remove}
          disabled={isUpdating}
          class="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="削除"
        >
          {#if isUpdating}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>