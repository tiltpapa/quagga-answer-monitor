<script lang="ts">
  import { optionsStore } from '../stores/optionsStore.js';

  let name = '';
  let exactMatch = false;
  let isAdding = false;

  async function addWatchedName() {
    if (!name.trim() || isAdding) return;

    isAdding = true;
    try {
      const success = await optionsStore.addWatchedName(name.trim(), exactMatch);
      if (success) {
        // 成功時はフォームをリセット
        name = '';
        exactMatch = false;
      }
    } finally {
      isAdding = false;
    }
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    addWatchedName();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      addWatchedName();
    }
  }
</script>

<form on:submit={handleSubmit} class="space-y-4">
  <!-- 名前入力 -->
  <div>
    <label for="watched-name" class="block text-sm font-medium text-gray-700 mb-2">
      監視対象の名前
    </label>
    <input
      id="watched-name"
      type="text"
      bind:value={name}
      on:keydown={handleKeydown}
      placeholder="例: 田中太郎"
      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      disabled={isAdding}
      required
    />
  </div>

  <!-- マッチング設定 -->
  <div>
    <div class="flex items-center">
      <input
        id="exact-match"
        type="checkbox"
        bind:checked={exactMatch}
        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        disabled={isAdding}
      />
      <label for="exact-match" class="ml-2 block text-sm text-gray-700">
        完全一致で検索する
      </label>
    </div>
    <p class="mt-1 text-sm text-gray-500">
      {#if exactMatch}
        入力した名前と完全に一致する参加者のみを監視します
      {:else}
        入力した名前を含む参加者を監視します（部分一致）
      {/if}
    </p>
  </div>

  <!-- 追加ボタン -->
  <div class="flex justify-end">
    <button
      type="submit"
      disabled={!name.trim() || isAdding}
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {#if isAdding}
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        追加中...
      {:else}
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        監視対象を追加
      {/if}
    </button>
  </div>
</form>

<!-- 使用例 -->
<div class="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
  <h4 class="text-sm font-medium text-gray-900 mb-2">使用例</h4>
  <div class="space-y-2 text-sm text-gray-600">
    <div>
      <span class="font-medium">完全一致:</span> 「田中太郎」→「田中太郎」のみマッチ
    </div>
    <div>
      <span class="font-medium">部分一致:</span> 「田中」→「田中太郎」「田中花子」「田中一郎」などがマッチ
    </div>
  </div>
</div>