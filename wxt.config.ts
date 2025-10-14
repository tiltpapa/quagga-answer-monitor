import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
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
    }
  },
  vite: () => ({
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    },
  }),
});