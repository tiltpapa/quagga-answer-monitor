import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Quagga回答権監視',
    description: 'Quaggaクイズで特定の回答者の回答権状況をリアルタイムで監視するChromeアドオン',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
    // quagga.studioドメインのみに制限 - 要件: 1.1, 4.4
    host_permissions: ['https://quagga.studio/*'],
    content_scripts: [
      {
        matches: ['https://quagga.studio/*'],
        js: ['content-scripts/content.js'],
        run_at: 'document_end'
      }
    ],
    side_panel: {
      default_path: 'sidepanel.html'
    },
    options_page: 'options.html',
    // Chrome Web Store用のアイコン設定
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png'
    }
  },
  vite: () => ({
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    },
    build: {
      // 本番ビルド最適化
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV === 'development'
    },
    // CSS最適化
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
          ...(process.env.NODE_ENV === 'production' ? [require('cssnano')] : [])
        ]
      }
    }
  }),
  // 本番ビルド用の追加設定
  webExt: {
    disabled: process.env.NODE_ENV === 'production'
  }
});