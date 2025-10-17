<script lang="ts">
  import { optionsStore, settings } from '../stores/optionsStore.js';

  let refreshInterval = $settings?.refreshInterval || 1000;
  let isUpdating = false;

  $: if ($settings) {
    refreshInterval = $settings.refreshInterval;
  }

  async function updateRefreshInterval() {
    if (isUpdating) return;
    
    isUpdating = true;
    try {
      await optionsStore.updateRefreshInterval(refreshInterval);
    } finally {
      isUpdating = false;
    }
  }

  function handleIntervalChange(event: Event) {
    const target = event.target as HTMLInputElement;
    refreshInterval = parseInt(target.value) || 1000;
  }
</script>

<div class="space-y-6">
  <!-- 更新間隔設定 -->
  <div>
    <label for="refresh-interval" class="block text-sm font-medium text-gray-700 mb-2">
      更新間隔 (ミリ秒)
    </label>
    <div class="flex items-center space-x-4">
      <input
        id="refresh-interval"
        type="number"
        min="100"
        max="10000"
        step="100"
        value={refreshInterval}
        on:input={handleIntervalChange}
        on:blur={updateRefreshInterval}
        class="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        disabled={isUpdating}
      />
      <span class="text-sm text-gray-500">
        現在: {refreshInterval}ms
      </span>
      {#if isUpdating}
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      {/if}
    </div>
    <p class="mt-2 text-sm text-gray-500">
      DOM変更の監視間隔を設定します。値が小さいほど反応が早くなりますが、CPU使用率が高くなります。
    </p>
  </div>

  <!-- 推奨設定 -->
  <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
    <h4 class="text-sm font-medium text-blue-900 mb-2">推奨設定</h4>
    <div class="space-y-2 text-sm text-blue-800">
      <div class="flex justify-between items-center">
        <span>高速応答 (CPU使用率高)</span>
        <button
          class="text-blue-600 hover:text-blue-800 underline"
          on:click={() => { refreshInterval = 500; updateRefreshInterval(); }}
          disabled={isUpdating}
        >
          500ms
        </button>
      </div>
      <div class="flex justify-between items-center">
        <span>標準 (推奨)</span>
        <button
          class="text-blue-600 hover:text-blue-800 underline"
          on:click={() => { refreshInterval = 1000; updateRefreshInterval(); }}
          disabled={isUpdating}
        >
          1000ms
        </button>
      </div>
      <div class="flex justify-between items-center">
        <span>省電力</span>
        <button
          class="text-blue-600 hover:text-blue-800 underline"
          on:click={() => { refreshInterval = 2000; updateRefreshInterval(); }}
          disabled={isUpdating}
        >
          2000ms
        </button>
      </div>
    </div>
  </div>
</div>