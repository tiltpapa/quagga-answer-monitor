<script lang="ts">
  import { onMount } from 'svelte';
  import WatchedNamesList from './components/WatchedNamesList.svelte';
  import AddWatchedName from './components/AddWatchedName.svelte';
  import GeneralSettings from './components/GeneralSettings.svelte';
  import { optionsStore, isLoading, error, settings } from './stores/optionsStore.js';

  function clearError() {
    optionsStore.clearError();
  }

  onMount(async () => {
    try {
      await optionsStore.initialize();
    } catch (err) {
      console.error('Failed to initialize options:', err);
    }
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- ヘッダー -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Quagga回答監視</h1>
          <p class="text-sm text-gray-500">設定画面</p>
        </div>
      </div>
    </div>
  </header>

  <!-- エラー表示 -->
  {#if $error}
    <div class="max-w-4xl mx-auto px-4 py-4">
      <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
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
            class="text-red-400 hover:text-red-600 transition-colors"
            on:click={clearError}
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- メインコンテンツ -->
  <main class="max-w-4xl mx-auto px-4 py-8">
    {#if $isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-500">設定を読み込み中...</p>
        </div>
      </div>
    {:else}
      <div class="space-y-8">
        <!-- 一般設定 -->
        <section class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">一般設定</h2>
            <p class="text-sm text-gray-500 mt-1">監視の基本設定を行います</p>
          </div>
          <div class="p-6">
            <GeneralSettings />
          </div>
        </section>

        <!-- 監視対象追加 -->
        <section class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">監視対象の追加</h2>
            <p class="text-sm text-gray-500 mt-1">新しい監視対象を追加します</p>
          </div>
          <div class="p-6">
            <AddWatchedName />
          </div>
        </section>

        <!-- 監視対象一覧 -->
        <section class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">監視対象一覧</h2>
                <p class="text-sm text-gray-500 mt-1">
                  登録済みの監視対象 ({$settings?.watchedNames?.length || 0}件)
                </p>
              </div>
              {#if $settings?.watchedNames?.length > 0}
                <button
                  class="text-sm text-red-600 hover:text-red-800 transition-colors"
                  on:click={() => optionsStore.resetToDefault()}
                >
                  すべてリセット
                </button>
              {/if}
            </div>
          </div>
          <div class="p-6">
            <WatchedNamesList />
          </div>
        </section>

        <!-- 使用方法 -->
        <section class="bg-blue-50 rounded-lg border border-blue-200">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-blue-900 mb-3">使用方法</h3>
            <div class="space-y-2 text-sm text-blue-800">
              <p>1. 上記で監視したい参加者名を登録してください</p>
              <p>2. Quagga Studioのクイズページにアクセスしてください</p>
              <p>3. 拡張機能のサイドパネルを開いて監視を開始してください</p>
              <p>4. 登録した参加者の回答権状況がリアルタイムで表示されます</p>
            </div>
          </div>
        </section>
      </div>
    {/if}
  </main>

  <!-- フッター -->
  <footer class="bg-white border-t border-gray-200 mt-12">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <div class="text-center text-sm text-gray-500">
        <p>Quagga回答監視 Chrome拡張機能 v1.0.0</p>
        <p class="mt-1">設定は自動的に保存されます</p>
      </div>
    </div>
  </footer>
</div>