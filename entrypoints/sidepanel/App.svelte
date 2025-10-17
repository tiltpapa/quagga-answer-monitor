<script lang="ts">
  /// <reference path="../../types/chrome.d.ts" />
  import { onMount, onDestroy } from "svelte";
  import StatusTab from "./components/StatusTab.svelte";
  import {
    appStore,
    isLoading,
    error,
    isConnected,
  } from "./stores/appStore.js";

  function clearError() {
    appStore.clearError();
  }

  onMount(async () => {
    try {
      await appStore.initialize();
    } catch (err) {
      console.error("Failed to initialize app:", err);
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
            <svg
              class="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{$error}</p>
          </div>
        </div>
        <button class="text-red-400 hover:text-red-600" on:click={clearError}>
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- 設定ボタン -->
  <div class="bg-white border-b border-gray-200 px-4 py-2">
    <button
      class="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      on:click={() => chrome.runtime.openOptionsPage()}
      disabled={$isLoading}
    >
      <svg
        class="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        ></path>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        ></path>
      </svg>
      設定を開く
    </button>
  </div>

  <!-- メインコンテンツ -->
  <main class="flex-1 overflow-auto">
    {#if $isLoading}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
          ></div>
          <p class="text-gray-500">読み込み中...</p>
        </div>
      </div>
    {:else}
      <StatusTab />
    {/if}
  </main>
</div>
