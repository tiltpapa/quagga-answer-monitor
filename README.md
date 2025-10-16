# Quagga回答権監視 Chrome拡張機能

Quaggaクイズで特定の回答者の回答権状況をリアルタイムで監視するChromeアドオンです。

## 概要

この拡張機能は、Quagga Studio（https://quagga.studio）でのクイズ参加時に、指定した参加者の回答権の状況を自動的に監視し、サイドパネルでリアルタイムに表示します。

## 主な機能

### 🎯 回答権監視
- 指定した参加者の回答権状況をリアルタイムで監視
- 回答権の有無を視覚的に表示
- DOM変更を自動検出して即座に状況を更新

### ⚙️ 柔軟な設定
- 監視対象の参加者名を複数登録可能
- 完全一致・部分一致の選択可能
- 個別の有効/無効切り替え
- 更新間隔のカスタマイズ

### 📊 直感的なUI
- サイドパネルでの状況表示
- 接続状態の可視化
- エラー状況の分かりやすい表示
- レスポンシブデザイン

### 🚀 高性能
- 効率的なDOM監視
- メモリ使用量の最適化
- 大量参加者への対応
- バッチ処理による負荷軽減

## インストール方法

### 開発版のインストール

1. このリポジトリをクローン
```bash
git clone <repository-url>
cd quagga-answer-monitor
```

2. 依存関係をインストール
```bash
npm install
```

3. 拡張機能をビルド
```bash
npm run build
```

4. Chromeで拡張機能を読み込み
   - Chrome の設定 → 拡張機能 → デベロッパーモード を有効化
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `.output/chrome-mv3` フォルダを選択

### Firefox版のビルド

```bash
npm run build:firefox
npm run zip:firefox
```

## 使用方法

### 1. 基本設定

1. Quagga Studioにアクセス
2. Chrome拡張機能のサイドパネルを開く
3. 「設定」タブで監視したい参加者名を登録

### 2. 監視対象の追加

- **参加者名**: 監視したい参加者の名前を入力
- **完全一致**: チェックすると名前が完全に一致する場合のみ監視
- **部分一致**: チェックを外すと名前の一部が含まれる場合も監視

### 3. 監視の開始

1. 「状況表示」タブに切り替え
2. 「監視開始」ボタンをクリック
3. リアルタイムで回答権の状況が表示されます

## 技術仕様

### 使用技術
- **フレームワーク**: WXT (Web Extension Toolkit)
- **フロントエンド**: Svelte + TypeScript
- **スタイリング**: Tailwind CSS
- **テスト**: Vitest
- **ビルドツール**: Vite

### 対応ブラウザ
- Chrome (Manifest V3)
- Firefox (Manifest V2)

### パフォーマンス最適化
- DOM変更の効率的な監視
- バッチ処理によるストレージ更新
- メモリ使用量の自動クリーンアップ
- 大量参加者向けの効率的検索アルゴリズム

## 開発

### 開発環境の起動

```bash
npm run dev
```

### テストの実行

```bash
# 単発テスト
npm test

# ウォッチモード
npm run test:watch
```

### 型チェック

```bash
npm run type-check
```

### ビルド

```bash
# Chrome版
npm run build

# Firefox版
npm run build:firefox

# 配布用ZIP作成
npm run zip
npm run zip:firefox
```

## プロジェクト構成

```
├── entrypoints/           # 拡張機能のエントリーポイント
│   ├── background.ts      # バックグラウンドスクリプト
│   ├── content.ts         # コンテンツスクリプト
│   ├── sidepanel/         # サイドパネルUI
│   └── sidepanel.html     # サイドパネルHTML
├── types/                 # TypeScript型定義
├── utils/                 # ユーティリティ関数
├── test/                  # テストファイル
├── public/                # 静的ファイル
└── wxt.config.ts          # WXT設定ファイル
```

## ライセンス

MIT License
