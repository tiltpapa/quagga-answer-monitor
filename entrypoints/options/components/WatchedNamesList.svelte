<script lang="ts">
  import { optionsStore, settings } from '../stores/optionsStore.js';
  import WatchedNameItem from './WatchedNameItem.svelte';

  $: watchedNames = $settings?.watchedNames || [];
  $: enabledCount = watchedNames.filter(wn => wn.enabled).length;
</script>

<div class="space-y-4">
  {#if watchedNames.length === 0}
    <!-- 空の状態 -->
    <div class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">監視対象が登録されていません</h3>
      <p class="mt-1 text-sm text-gray-500">上記のフォームから監視したい参加者を追加してください</p>
    </div>
  {:else}
    <!-- 統計情報 -->
    <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          <span class="text-sm font-medium text-blue-900">
            監視対象統計
          </span>
        </div>
        <div class="text-sm text-blue-800">
          有効: {enabledCount}件 / 全体: {watchedNames.length}件
        </div>
      </div>
    </div>

    <!-- 監視対象リスト -->
    <div class="space-y-3">
      {#each watchedNames as watchedName (watchedName.id)}
        <WatchedNameItem {watchedName} />
      {/each}
    </div>

    <!-- 一括操作 -->
    {#if watchedNames.length > 1}
      <div class="border-t border-gray-200 pt-4">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-500">一括操作</span>
          <div class="space-x-2">
            <button
              class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              on:click={() => {
                watchedNames.forEach(wn => {
                  if (!wn.enabled) {
                    optionsStore.updateWatchedName(wn.id, { enabled: true });
                  }
                });
              }}
            >
              すべて有効化
            </button>
            <button
              class="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              on:click={() => {
                watchedNames.forEach(wn => {
                  if (wn.enabled) {
                    optionsStore.updateWatchedName(wn.id, { enabled: false });
                  }
                });
              }}
            >
              すべて無効化
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>