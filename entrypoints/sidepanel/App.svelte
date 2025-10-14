<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import StatusTab from './components/StatusTab.svelte';
  import SettingsTab from './components/SettingsTab.svelte';
  import { appStore, isLoading, error, isConnected } from './stores/appStore.js';

  type TabType = 'status' | 'settings';
  let activeTab: TabType = 'status';

  function switchTab(tab: TabType) {
    activeTab = tab;
  }

  function clearError() {
    appStore.clearError();
  }

  onMount(async () => {
    try {
      await appStore.initialize();
    } catch (err) {
      console.error('Failed to initialize app:', err);
    }
  });

  onDestroy(() => {
    appStore.cleanup();
  });
</script>

<div class="flex flex-col h-full bg-gray-50">
  <!-- ヘッダー -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-semibold text-gray-900">Quagga回答監視</h1>
      
      <!-- 接続状態インジケーター -->
      <div class="flex items-center space-x-2">
        {#if $isLoading}
          <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span class="text-xs text-gray-500">読み込み中...</span>
        {:else if $isConnected}
          <div class="w-2 h-2 bg-green-400 rounded-full"></div>
          <span class="text-xs text-gray-500">接続済み</span>
        {:else}
          <div class="w-2 h-2 bg-red-400 rounded-full"></div>
          <span class="text-xs text-gray-500">未接続</span>
        {/if}
      </div>
    </div>
  </header>

  <!-- エラー表示 -->
  {#if $error}
    <div class="bg-red-50 border-l-4 border-red-400 p-4">
      <div class="flex items-center justify-between">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{$error}</p>
          </div>
        </div>
        <button
          class="text-red-400 hover:text-red-600"
          on:click={clearError}
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- タブナビゲーション -->
  <nav class="bg-white border-b border-gray-200">
    <div class="flex">
      <button
        class="flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors duration-200 {activeTab === 'status' 
          ? 'border-blue-500 text-blue-600 bg-blue-50' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
        on:click={() => switchTab('status')}
        disabled={$isLoading}
      >
        状況表示
      </button>
      <button
        class="flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors duration-200 {activeTab === 'settings' 
          ? 'border-blue-500 text-blue-600 bg-blue-50' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
        on:click={() => switchTab('settings')}
        disabled={$isLoading}
      >
        設定
      </button>
    </div>
  </nav>

  <!-- タブコンテンツ -->
  <main class="flex-1 overflow-auto">
    {#if $isLoading}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-500">読み込み中...</p>
        </div>
      </div>
    {:else if activeTab === 'status'}
      <StatusTab />
    {:else if activeTab === 'settings'}
      <SettingsTab />
    {/if}
  </main>
</div>