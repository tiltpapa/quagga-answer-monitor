<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    monitorState,
    settings,
    isLoading,
    error,
    appStore,
  } from "../stores/appStore.js";
  import type { AnswerStatus, WatchedName } from "../../../types/index.js";

  // リアクティブな状態
  $: watchedNames = $settings?.watchedNames || [];
  $: statuses = $monitorState?.statuses || [];
  $: isActive = $monitorState?.isActive || false;
  $: lastScan = $monitorState?.lastScan || 0;

  // デバッグログ
  $: {
    console.log("StatusTab: settings:", $settings);
    console.log("StatusTab: watchedNames:", watchedNames);
    console.log("StatusTab: watchedNames.length:", watchedNames.length);
  }

  // 監視対象と状況のマッピング
  $: statusMap = new Map(
    statuses.map((status) => [status.watchedNameId, status]),
  );

  // 表示用データの型定義
  interface DisplayItem {
    watchedName: WatchedName;
    status: AnswerStatus | null;
    found: boolean;
    hasRight: boolean;
    matchedName: string;
    lastUpdated: number;
  }

  // 表示用データの作成
  $: displayItems = watchedNames
    .filter((name) => name.enabled)
    .map((name) => {
      const status = statusMap.get(name.id);
      return {
        watchedName: name,
        status: status || null,
        found: status?.found || false,
        hasRight: status?.hasRight || false,
        matchedName: status?.matchedName || "",
        lastUpdated: status?.lastUpdated || 0,
      } as DisplayItem;
    });

  // 時刻フォーマット関数
  function formatTime(timestamp: number): string {
    if (!timestamp) return "---";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  // 相対時間表示
  function getRelativeTime(timestamp: number): string {
    if (!timestamp) return "";
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return "たった今";
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    return `${Math.floor(diff / 3600000)}時間前`;
  }

  // 回答権状況のアイコンとスタイル
  function getRightStatusIcon(hasRight: boolean, found: boolean): string {
    if (!found) return "❓";
    return hasRight ? "✅" : "❌";
  }

  function getRightStatusText(hasRight: boolean, found: boolean): string {
    if (!found) return "見つかりません";
    return hasRight ? "回答権あり" : "回答権なし";
  }

  function getRightStatusClass(hasRight: boolean, found: boolean): string {
    if (!found) return "text-gray-500 bg-gray-50";
    return hasRight ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50";
  }

  // リアルタイム更新のための状態
  let updateCount = 0;
  let lastUpdateTime = 0;

  // 更新アニメーション用の状態
  let updatedItems = new Set<string>();

  // 状況変化の検出
  $: {
    // 状況が更新された時の処理
    if (statuses.length > 0 && lastUpdateTime !== lastScan) {
      lastUpdateTime = lastScan;
      updateCount++;

      // 更新されたアイテムをハイライト
      statuses.forEach((status) => {
        if (status.lastUpdated > Date.now() - 2000) {
          // 2秒以内の更新
          updatedItems.add(status.watchedNameId);
          // 3秒後にハイライトを削除
          setTimeout(() => {
            updatedItems.delete(status.watchedNameId);
            updatedItems = new Set(updatedItems);
          }, 3000);
        }
      });
      updatedItems = new Set(updatedItems);
    }
  }

  // 自動リフレッシュ機能
  let refreshInterval: NodeJS.Timeout | null = null;

  function startAutoRefresh() {
    if (refreshInterval) return;

    refreshInterval = setInterval(async () => {
      if (isActive && watchedNames.length > 0) {
        try {
          // 状態を強制的に更新
          await appStore.getStatus();
          // ストアは自動的に更新される
        } catch (error) {
          console.error("Auto refresh failed:", error);
        }
      }
    }, $settings?.refreshInterval || 1000);
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // 手動リフレッシュ
  async function handleManualRefresh() {
    try {
      if (watchedNames.length > 0) {
        await appStore.startMonitoring();
      }
    } catch (error) {
      console.error("Manual refresh failed:", error);
    }
  }

  onMount(() => {
    // 初期化時に監視を開始
    if (!isActive && watchedNames.length > 0) {
      appStore.startMonitoring().catch(console.error);
    }

    // 自動リフレッシュを開始
    startAutoRefresh();
  });

  onDestroy(() => {
    stopAutoRefresh();
  });
</script>

<div class="p-4 space-y-4">
  <!-- ヘッダー情報 -->
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-semibold text-gray-800">監視状況</h2>
    <div class="flex items-center space-x-3">
      <!-- 手動リフレッシュボタン -->
      <button
        on:click={handleManualRefresh}
        class="p-1 text-gray-500 hover:text-blue-600 transition-colors"
        title="手動更新"
        disabled={$isLoading}
      >
        <svg
          class="w-4 h-4 {$isLoading ? 'animate-spin' : ''}"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      <!-- 監視状態 -->
      {#if isActive}
        <div class="flex items-center text-green-600">
          <div
            class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"
          ></div>
          <span class="text-sm">監視中</span>
        </div>
      {:else}
        <div class="flex items-center text-gray-500">
          <div class="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          <span class="text-sm">停止中</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- 最終スキャン時刻 -->
  {#if lastScan > 0}
    <div class="text-xs text-gray-500 text-center bg-gray-50 rounded p-2">
      <div class="flex items-center justify-center space-x-2">
        <span>🕐</span>
        <span
          >最終スキャン: {formatTime(lastScan)} ({getRelativeTime(
            lastScan,
          )})</span
        >
      </div>
      {#if displayItems.filter((item) => !item.found).length > 0}
        <div class="mt-1 text-gray-400">
          {displayItems.filter((item) => !item.found)
            .length}件の監視対象が見つかりませんでした
        </div>
      {/if}
    </div>
  {:else if displayItems.length > 0}
    <div class="text-xs text-gray-400 text-center bg-gray-50 rounded p-2">
      <div class="flex items-center justify-center space-x-2">
        <span>⏳</span>
        <span>スキャン待機中...</span>
      </div>
    </div>
  {/if}

  <!-- エラー表示 -->
  {#if $error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
      <div class="flex items-center">
        <span class="text-red-500 mr-2">⚠️</span>
        <span class="text-red-700 text-sm">{$error}</span>
      </div>
    </div>
  {/if}

  <!-- ローディング状態 -->
  {#if $isLoading}
    <div class="text-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"
      ></div>
      <p class="text-sm text-gray-500">読み込み中...</p>
    </div>
  {:else if displayItems.length === 0}
    <!-- 監視対象が設定されていない場合 -->
    <div class="text-center text-gray-500 py-8">
      <div class="text-4xl mb-2">👥</div>
      <p class="text-lg font-medium mb-2">監視対象が設定されていません</p>
      <p class="text-sm">設定タブで監視したい回答者名を追加してください</p>
    </div>
  {:else}
    <!-- 監視対象一覧 -->
    <div class="space-y-3">
      {#each displayItems as item (item.watchedName.id)}
        <div
          class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-300 {updatedItems.has(
            item.watchedName.id,
          )
            ? 'ring-2 ring-blue-300 bg-blue-50'
            : ''}"
        >
          <!-- 監視対象名前 -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-800"
                >{item.watchedName.name}</span
              >
              {#if item.watchedName.exactMatch}
                <span
                  class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                  >完全一致</span
                >
              {:else}
                <span
                  class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                  >部分一致</span
                >
              {/if}
            </div>
          </div>

          <!-- 状況表示 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <!-- 状況アイコンとテキスト -->
              <div class="flex items-center space-x-2">
                <span class="text-xl"
                  >{getRightStatusIcon(item.hasRight, item.found)}</span
                >
                <span
                  class="text-sm font-medium {getRightStatusClass(
                    item.hasRight,
                    item.found,
                  ).split(' ')[0]}"
                >
                  {getRightStatusText(item.hasRight, item.found)}
                </span>
              </div>
            </div>

            <!-- 最終更新時刻 -->
            {#if item.lastUpdated > 0}
              <div class="text-xs text-gray-500">
                {getRelativeTime(item.lastUpdated)}
              </div>
            {:else if !item.found}
              <div class="text-xs text-gray-400">未スキャン</div>
            {/if}
          </div>

          <!-- 見つからない場合の詳細情報 -->
          {#if !item.found && lastScan > 0}
            <div class="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
              <div class="flex items-center space-x-2">
                <span>🔍</span>
                <span>最終スキャン: {formatTime(lastScan)}</span>
              </div>
              <div class="mt-1 text-gray-500">
                {#if item.watchedName.exactMatch}
                  「{item.watchedName
                    .name}」と完全一致する名前が見つかりませんでした
                {:else}
                  「{item.watchedName.name}」を含む名前が見つかりませんでした
                {/if}
              </div>
            </div>
          {/if}

          <!-- マッチした名前の表示（部分一致の場合） -->
          {#if item.found && item.matchedName && item.matchedName !== item.watchedName.name}
            <div class="mt-2 text-xs text-gray-600">
              マッチした名前: <span class="font-mono bg-gray-100 px-1 rounded"
                >{item.matchedName}</span
              >
            </div>
          {/if}

          <!-- 状況バッジ -->
          <div class="mt-3">
            <div
              class="inline-flex items-center px-2 py-1 rounded-full text-xs {getRightStatusClass(
                item.hasRight,
                item.found,
              )}"
            >
              {getRightStatusText(item.hasRight, item.found)}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- 統計情報 -->
    <div class="mt-6 bg-gray-50 rounded-lg p-3">
      <div class="grid grid-cols-4 gap-3 text-center">
        <div>
          <div class="text-lg font-semibold text-gray-800">
            {displayItems.length}
          </div>
          <div class="text-xs text-gray-500">監視対象</div>
        </div>
        <div>
          <div class="text-lg font-semibold text-green-600">
            {displayItems.filter((item) => item.found && item.hasRight).length}
          </div>
          <div class="text-xs text-gray-500">回答権あり</div>
        </div>
        <div>
          <div class="text-lg font-semibold text-red-600">
            {displayItems.filter((item) => item.found && !item.hasRight).length}
          </div>
          <div class="text-xs text-gray-500">回答権なし</div>
        </div>
        <div>
          <div class="text-lg font-semibold text-gray-600">
            {displayItems.filter((item) => !item.found).length}
          </div>
          <div class="text-xs text-gray-500">見つからず</div>
        </div>
      </div>

      <!-- 見つからない項目がある場合の追加情報 -->
      {#if displayItems.filter((item) => !item.found).length > 0}
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="text-xs text-gray-600 text-center">
            <span class="inline-flex items-center">
              <span class="mr-1">💡</span>
              見つからない場合は、名前の表記や一致設定を確認してください
            </span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
